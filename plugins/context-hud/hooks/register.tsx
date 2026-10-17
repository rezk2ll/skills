/* @jsx h */
import type {
  EngineInterface,
  Register,
  SessionContextBreakdown,
  ContextCategory,
} from 'claude-code'
import { atom, read as readState, update } from 'claude-code'

import { fit, filledCells, gauge, heat, right, signed, tokens } from './format'
import type { Cell } from './format'
import type { Limit } from '../types'

// A pinned line under the prompt carries the window fill and what the last turn added;
// `/context-hud` opens a pane with the same figures broken down by category. Every
// reading comes from `$.session.usage`, asked with `breakdown: "summary"` (free, local)
// after each turn, and with `"full"` only when the user runs `/context-hud refresh`.

const PANE_ID = 'context-hud'
const COMMAND = 'context-hud'
let warnAt = 200_000
const HISTORY_MAX = 24
const AVERAGE_OVER = 5
const BAR_MAX = 48

type Snapshot = {
  used: number
  window: number
  percent: number
  /** The token count the headroom is measured against. */
  threshold: number
  /** Where that figure came from: the engine's own threshold, the compaction window, or the plain window. */
  limit: 'auto-compact' | 'compaction-window' | 'window'
  breakdown: SessionContextBreakdown | null
  detail: 'summary' | 'full'
}

let snap: Snapshot | null = null
/** Tokens in the window after each finished turn, since the last compaction. */
let history: number[] = []
let paneOpen = false
let hasWarned = false

// The engine exposes no cache expiry to mods; the session's prompt cache lives an hour
// on a subscription (five minutes once in overage), counted from the last request.
const CACHE_TTL_MS = 3600_000

// Written by the review-chain plugin, one `<skill> <epoch>` line per run. Without
// that plugin the directory never exists and the chain row stays hidden.
const CHAIN = [
  { skill: 'code-review', label: 'review' },
  { skill: 'ponytail-review', label: 'ponytail' },
  { skill: 'comment-cleanup', label: 'cleanup' },
] as const
let chainDone = new Set<string>()
let hasChain = false

async function chainDir($: EngineInterface): Promise<string> {
  const dir = await $.env.get('REVIEW_CHAIN_DIR')
  if (dir) return dir
  return `${(await $.env.get('TMPDIR')) || '/tmp'}/claude-review-chain`
}

async function readChain($: EngineInterface): Promise<void> {
  try {
    const dir = await chainDir($)
    hasChain = await $.fs.exists(dir)
    if (!hasChain) return
    const text = await $.fs.read(`${dir}/${await $.session.id()}`)
    chainDone = new Set(text.split('\n').map(l => l.split(' ')[0] ?? ''))
  } catch {
    chainDone = new Set()
  }
}

/** Reads the window. Keeps the last good snapshot when the call fails. */
async function read($: EngineInterface, detail: 'summary' | 'full'): Promise<void> {
  let context
  try {
    context = (await $.session.usage({ breakdown: detail })).context
  } catch {
    return
  }
  const breakdown = context.breakdown ?? snap?.breakdown ?? null
  const used = context.tokens ?? breakdown?.totalTokens
  const window = context.window || breakdown?.rawMaxTokens || 0
  if (used === undefined || window <= 0) return
  const auto =
    breakdown && breakdown.isAutoCompactEnabled ? breakdown.autoCompactThreshold : undefined
  snap = {
    used,
    window,
    percent: context.percent ?? Math.round((used / window) * 100),
    threshold: auto ?? breakdown?.rawMaxTokens ?? window,
    limit: auto !== undefined ? 'auto-compact' : breakdown ? 'compaction-window' : 'window',
    breakdown,
    detail: context.breakdown ? detail : (snap?.detail ?? detail),
  }
}

/** What the last turn added, and the average of the recent turns that grew. */
function growth(): { last?: number; average?: number; over: number } {
  const deltas: number[] = []
  for (let i = 1; i < history.length; i++) deltas.push((history[i] ?? 0) - (history[i - 1] ?? 0))
  const rising = deltas.filter(d => d > 0).slice(-AVERAGE_OVER)
  const average = rising.length
    ? rising.reduce((a, b) => a + b, 0) / rising.length
    : undefined
  return { last: deltas.at(-1), average, over: rising.length }
}

/** Turns of the recent average that still fit before the threshold. */
function turnsLeft(average: number | undefined): number | undefined {
  if (!snap || average === undefined || average <= 0) return undefined
  return Math.max(0, Math.floor((snap.threshold - snap.used) / average))
}

/** `3 turns`, and `99+ turns` past a hundred: a five-digit count says nothing useful. */
function turnCount(n: number): string {
  return n > 99 ? '99+ turns' : `${n} turn${n === 1 ? '' : 's'}`
}

/**
 * Redraws the band and the pane. Never throws. No `$.ui.status`: the engine draws
 * that as a warning-style notice, and the band already carries the figures.
 */
function show($: EngineInterface): void {
  try {
    $.ui.invalidate('ui.render')
  } catch {
    /* the next turn redraws it */
  }
}

/** Used rows biggest first, then the compaction buffer, then the free space. */
function rowsOf(breakdown: SessionContextBreakdown): ContextCategory[] {
  const rank = (c: ContextCategory) => (c.kind === 'free' ? 2 : c.kind === 'buffer' ? 1 : 0)
  return breakdown.categories
    .filter(c => !c.isDeferred && c.tokens > 0)
    .sort((a, b) => rank(a) - rank(b) || b.tokens - a.tokens)
}

/**
 * After a compaction or /clear the window was rewritten: the old reading and the
 * old per-turn growth say nothing about the new one. The engine reports no token
 * count until the next answer, so the gauge hides rather than showing the stale
 * figures as current. The growth history restarts from the next finished turn.
 */
async function forget($: EngineInterface): Promise<void> {
  snap = null
  history = []
  await read($, 'summary')
  show($)
}

/** Toasts once each time the window crosses warnAt; dropping back under re-arms it. */
function warn($: EngineInterface): void {
  if (!snap) return
  if (snap.used < warnAt) {
    hasWarned = false
    return
  }
  if (hasWarned) return
  hasWarned = true
  try {
    $.ui.toast(`Context at ${tokens(snap.used)}: consider /compact or /clear`)
  } catch {
    /* the status line still shows the figure */
  }
}

const limits = atom({ plugin: 'context-hud', key: 'limits' } as const, [] as Limit[])
const now = atom({ plugin: 'context-hud', key: 'now' } as const, 0)
// True once the engine has measured the session: an account with no limits
// (an API key) then shows nothing rather than a waiting message.
const measured = atom({ plugin: 'context-hud', key: 'measured' } as const, false)
// When the last main-thread turn ended: the last request that warmed the cache.
// Held as state, not a variable, so a hot reload does not lose it.
const lastTurnAt = atom({ plugin: 'context-hud', key: 'lastTurnAt' } as const, 0)

type Window = { label: string; short: string; ms: number }
const WINDOWS: Record<string, Window> = {
  five_hour: { label: '5-hour', short: '5H', ms: 5 * 3600_000 },
  seven_day: { label: 'Weekly', short: 'WK', ms: 7 * 86400_000 },
  // Team / Enterprise / gateway accounts: no fixed window, so no pace marker
  spend_limit: { label: 'Spend', short: 'SP', ms: 0 },
}
const windowOf = (kind: string): Window =>
  WINDOWS[kind] ?? { label: kind.replace(/_/g, ' '), short: kind.slice(0, 2).toUpperCase(), ms: 0 }

type Row = {
  kind: string
  label: string
  short: string
  pct: number
  /** 0..1 of the window already elapsed, when the reset time is known */
  elapsed?: number
  /** where usage lands at reset if the current rate holds */
  projected?: number
  resetIn: string
  /** just the countdown, for the compact layout */
  resetShort: string
  level: 'ok' | 'warn' | 'hot'
}

const fmtDuration = (ms: number) => {
  const mins = Math.max(0, Math.round(ms / 60000))
  const d = Math.floor(mins / 1440)
  const h = Math.floor((mins % 1440) / 60)
  const m = mins % 60
  return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`
}

const toRow = (l: Limit, at: number): Row => {
  const w = windowOf(l.kind)
  const pct = l.percentUsed
  let elapsed: number | undefined
  let projected: number | undefined
  let resetIn = ''
  let resetShort = ''
  const resetMs = l.resetsAt ? Date.parse(l.resetsAt) - at : NaN
  if (resetMs > 0) {
    resetShort = fmtDuration(resetMs)
    resetIn = `resets in ${resetShort}`
    if (w.ms > 0) {
      elapsed = Math.min(1, Math.max(0, 1 - resetMs / w.ms))
      if (elapsed > 0.05) projected = Math.round(pct / elapsed)
    }
  } else if (l.resetsAt) {
    resetIn = 'resetting now'
    resetShort = 'now'
  }
  const level =
    pct >= 90 || (projected ?? 0) >= 100 ? 'hot' : pct >= 70 || (projected ?? 0) >= 85 ? 'warn' : 'ok'
  return { kind: l.kind, label: w.label, short: w.short, pct, elapsed, projected, resetIn, resetShort, level }
}

const paceText = (r: Row) =>
  r.projected === undefined ? '' : r.projected >= 100 ? 'on pace for 100%+' : `on pace for ~${r.projected}%`

// ---------- desktop: SVG card ----------

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Compact: one row per window, stacked. Set in the app's own UI font with
// tabular figures, so it matches the band's text; 12px everywhere around it.
const SEP_GAP = 12
const CONTENT_W = 116
const SVG_W = SEP_GAP + CONTENT_W + SEP_GAP
const ROW_H = 17
const svgHeight = (n: number) => n * ROW_H

const svgCard = (rows: Row[]) => {
  const PCT_END = 54
  const cells = rows
    .map((r, i) => {
      const base = i * ROW_H + 13
      return `
  <text class="label" x="0" y="${base}">${esc(r.short)}</text>
  <text class="pct ${r.level}" x="${PCT_END}" y="${base}" text-anchor="end">${Math.round(r.pct)}<tspan class="unit">%</tspan></text>
  <text class="meta" x="${CONTENT_W}" y="${base}" text-anchor="end">${r.resetShort ? '↻ ' + esc(r.resetShort) : ''}</text>`
    })
    .join('')
  const H = svgHeight(rows.length)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SVG_W} ${H}" width="${SVG_W}" height="${H}">
  <style>
    svg { --fg:#3d3d3a; --muted:#8a8985; --track:rgba(0,0,0,.12); --warn:#b7791f; --hot:#c4483e;
          font-family: system-ui, "Segoe UI", -apple-system, sans-serif; font-variant-numeric: tabular-nums; }
    @media (prefers-color-scheme: dark) {
      svg { --fg:#d4d3cf; --muted:#8f8e8a; --track:rgba(255,255,255,.14); --warn:#e0a84a; --hot:#e8766c; }
    }
    text { fill:var(--muted); }
    .label { font-size:10px; font-weight:600; letter-spacing:.08em; }
    .pct { font-size:12.5px; font-weight:600; fill:var(--fg); }
    .unit { font-size:10px; font-weight:500; }
    .pct.warn { fill:var(--warn); } .pct.hot { fill:var(--hot); }
    .meta { font-size:11px; }
    .sep { stroke:var(--track); stroke-width:1; }
  </style>
  <line class="sep" x1="0.5" x2="0.5" y1="1" y2="${H - 1}"/>
  <line class="sep" x1="${SVG_W - 0.5}" x2="${SVG_W - 0.5}" y1="1" y2="${H - 1}"/>
  <g transform="translate(${SEP_GAP},0)">${cells}</g>
</svg>`
}

// A limit on pace to run out before it resets reads red whatever its fill.
const limitColor = (r: Row) => (r.level === 'hot' ? heat(1) : heat(r.pct / 100))

export const register: Register = (on, options) => {
  warnAt = Number(options.warnAt) || 200_000

  on('session.start', async ($, e, next) => {
    const result = await next(e)
    // An earlier version pinned a status notice; the host keeps it across reloads.
    $.ui.status(undefined)
    try {
      await $.command.register({
        name: COMMAND,
        description: 'Live /context: the window by category, growth per turn, turns to compaction',
        argumentHint: '[refresh]',
      })
    } catch (error) {
      $.ui.log(`context-hud: /${COMMAND} not registered: ${String(error)}`)
    }
    // The reading at start is the engine's estimate of the window; the growth
    // history starts from the first finished turn, so a real count is never
    // compared against an estimate.
    await read($, 'summary')
    show($)

    // The limits band reads these; the engine allows one unmatched session.start per mod.
    const t = await $.clock.now()
    await update($, now, () => t)
    const usage = await $.session.usage()
    await update($, limits, () => usage.rateLimits.map(l => ({ ...l })))
    // Tick once a minute so the countdowns and pace marker stay current.
    $.clock.every(60_000, () => {
      void $.clock.now().then(t => update($, now, () => t))
    })
    return result
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    // A subagent's turn is answered over its own window, not this one.
    if (e.agentId !== undefined) return result
    try {
      const t = await $.clock.now()
      await update($, lastTurnAt, () => t)
    } catch {
      /* the cache timer waits for the next turn */
    }
    await Promise.all([read($, 'summary'), readChain($)])
    if (snap) {
      history.push(snap.used)
      if (history.length > HISTORY_MAX) history = history.slice(-HISTORY_MAX)
    }
    show($)
    warn($)
    return result
  })

  on('session.compact', async ($, e, next) => {
    const result = await next(e)
    await forget($)
    return result
  })

  on('command.run', { command: 'clear' }, async ($, e, next) => {
    const result = await next(e)
    await forget($)
    return result
  })

  on('command.run', { command: COMMAND }, async ($, e, next) => {
    if (e.args.trim().toLowerCase() === 'refresh') {
      await read($, 'full')
      if (!paneOpen) {
        try {
          await $.ui.open({ id: PANE_ID, title: 'Context', rows: 18 })
          paneOpen = true
        } catch {
          /* fall through: the counted figures still land on the status line */
        }
      }
      show($)
      return { text: 'counted with the token-count API' }
    }
    if (paneOpen) {
      try {
        await $.ui.close({ id: PANE_ID })
      } catch {
        return { text: 'the pane would not close' }
      }
      paneOpen = false
      return { text: 'pane closed' }
    }
    if (!snap) await read($, 'summary')
    try {
      await $.ui.open({ id: PANE_ID, title: 'Context', rows: 18 })
    } catch (error) {
      return { text: `the pane would not open (${String(error)})` }
    }
    paneOpen = true
    show($)
    return { text: 'pane open - /context-hud closes it, /context-hud refresh counts exactly' }
  })

  on('ui.close', { id: PANE_ID }, async ($, e, next) => {
    const result = await next(e)
    paneOpen = false
    return result
  })

  on('ui.render', { component: 'Pane' }, ($, e, next) => {
    if (e.requestId !== PANE_ID) return next(e)
    // Being asked to draw is proof the pane is open: after a hot reload this is how the
    // module learns it again, so the toggle and the per-turn redraw stay in step.
    paneOpen = true
    const { Box, Text } = $.ui.resolve(e)
    const columns = Math.max(24, e.props.bodyColumns)

    if (!snap) {
      return (
        <Box flexDirection="column">
          <Text dimColor>No reading of the context window yet. It arrives with the first answer.</Text>
        </Box>
      )
    }

    // label, bar, tokens, percent. The bar takes what is left, and stops growing past
    // BAR_MAX so a docked pane on a wide screen does not draw a bar the width of the screen.
    const labelW = Math.min(19, Math.max(7, columns - 26))
    const barW = Math.min(BAR_MAX, Math.max(4, columns - labelW - 14))
    const { last, average, over } = growth()
    const left = turnsLeft(average)
    const breakdown = snap.breakdown
    const base = breakdown?.rawMaxTokens || snap.window
    const spare = Math.max(0, snap.threshold - snap.used)

    const row = (key: string, label: string, share: number, count: number, color: string) => {
      const lit = filledCells(share, barW)
      return (
        <Box key={key} flexDirection="row">
          <Text wrap="truncate-end">{fit(label, labelW)}</Text>
          <Text color={color}>{'█'.repeat(lit)}</Text>
          <Text color="inactive">{'░'.repeat(barW - lit)}</Text>
          <Text>{right(tokens(count), 7)}</Text>
          <Text dimColor>{right(`${Math.round(share * 100)}%`, 5)}</Text>
        </Box>
      )
    }

    const note = (label: string, text: string, dim?: true) => (
      <Box flexDirection="row">
        <Text dimColor>{fit(label, labelW)}</Text>
        <Text dimColor={dim} wrap="truncate-end">{text}</Text>
      </Box>
    )

    const limitText =
      snap.limit === 'auto-compact'
        ? `${tokens(snap.threshold)}, where auto-compaction runs`
        : snap.limit === 'compaction-window'
          ? `${tokens(snap.threshold)}, the compaction window (auto-compaction is off)`
          : `${tokens(snap.threshold)}, the window itself - this build reports no compaction threshold`

    return (
      <Box flexDirection="column">
        <Text bold wrap="truncate-end">
          {`${tokens(snap.used)} of ${tokens(snap.window)} used · ${snap.percent}%${breakdown ? ` · ${breakdown.model}` : ''}`}
        </Text>
        {row('total', 'window', snap.used / snap.window, snap.used, 'success')}
        <Text> </Text>
        {breakdown ? (
          <Box flexDirection="column">
            {rowsOf(breakdown).map(c =>
              row(`cat:${c.name}`, c.name.toLowerCase(), c.tokens / base, c.tokens, c.color),
            )}
          </Box>
        ) : (
          <Text dimColor wrap="truncate-end">
            This build of Claude Code answers $.session.usage with no category breakdown, so only the window bar is drawn.
          </Text>
        )}
        <Text> </Text>
        {note(
          'growth',
          last === undefined
            ? 'nothing measured yet - it arrives with the second answer'
            : `${signed(last)} last turn${average === undefined ? '' : `, ${signed(average)} average over ${over} turn${over === 1 ? '' : 's'}`}`,
        )}
        {note(
          'headroom',
          left === undefined
            ? `${tokens(spare)} left, no growth rate yet`
            : `${turnCount(left)} at that rate, ${tokens(spare)} left`,
        )}
        {note('limit', limitText)}
        {note(
          'counted',
          snap.detail === 'full'
            ? 'exactly, with the token-count API'
            : 'locally, as an estimate - /context-hud refresh counts exactly',
          true,
        )}
      </Box>
    )
  })

  on('session.measure', async ($, e, next) => {
    // In the background, so Claude Code never waits on the widget.
    void update($, measured, () => true)
    if (e.changed.includes('rateLimits')) void update($, limits, () => e.rateLimits.map(l => ({ ...l })))
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    // Whatever else draws in the band (another mod) stays, on the left.
    const inner = await next(e)
    if (e.props.hasSurvey) return inner

    const els = $.ui.resolve(e) as Record<string, any>
    const { Box, Text } = els
    const [savedNow, saved, wasMeasured] = await Promise.all([
      readState($, now),
      readState($, limits),
      readState($, measured),
    ])
    const at = savedNow || (await $.clock.now())
    const rows = saved.map(l => toRow(l, at))

    // The terminal draws the gauges on the footer row (SessionMode below).
    if (e.surface !== 'desktop' || !els.Svg) return inner

    if (rows.length === 0) {
      // No limits on this account (e.g. an API key): stay out of the way.
      if (wasMeasured) {
        return inner
      }
      return (
        <Box flexDirection="row" alignItems="center" gap={1} flexGrow={1}>
          <Box flexGrow={1}>{inner}</Box>
          <Text dimColor>usage: waiting for first reply</Text>
        </Box>
      )
    }

    const Svg = els.Svg
    const alt = rows
      .map(r => [`${r.label} ${r.pct}% used`, r.resetIn, paceText(r)].filter(Boolean).join(', '))
      .join('; ')
    return (
      <Box flexDirection="row" alignItems="center" gap={1} flexGrow={1}>
        {/* left side: other mods in the band */}
        <Box flexGrow={1}>{inner}</Box>
        <Svg source={svgCard(rows)} alt={alt} width={SVG_W} height={svgHeight(rows.length)} />
      </Box>
    )
  })

  // SessionMode is the right side of the footer row that holds the permission mode;
  // PromptHint is a row of its own under it, so gauges drawn there sit a row low.
  on('ui.render', { component: 'SessionMode' }, async ($, e, next) => {
    const inner = await next(e)
    if (e.surface !== 'terminal') return inner

    const { Box, Text } = $.ui.resolve(e)
    const [savedNow, saved, turnAt] = await Promise.all([
      readState($, now),
      readState($, limits),
      readState($, lastTurnAt),
    ])
    const at = savedNow || (await $.clock.now())
    const rows = saved.map(l => toRow(l, at))
    if (!snap && rows.length === 0) return inner

    // The bars share what the footer's left side leaves (the permission mode and the
    // agent count, about 60 columns): each gauge's label, percent and figure take
    // about 16 columns, the gaps 2 each.
    const columns = e.viewport?.columns ?? 120
    const gauges = (snap ? 1 : 0) + rows.length
    const room = columns - 60 - e.props.modes.join(' & ').length - gauges * (16 + 2)
    const width = Math.max(3, Math.min(14, Math.floor(room / gauges)))
    const bar = (cells: Cell[]) =>
      cells.map((c, i) => (
        <Text key={String(i)} color={c.color}>
          {c.ch}
        </Text>
      ))
    const ctxShare = snap ? snap.used / snap.threshold : 0

    const cacheLeft = turnAt ? CACHE_TTL_MS - (at - turnAt) : undefined
    const due = CHAIN.find(c => !chainDone.has(c.skill))

    // The footer's left side is two rows (the hint, then the permission mode) and this
    // side is pinned to the top one, so the facts take the top row and the gauges the mode's.
    return (
      <Box flexDirection="column">
        <Box flexDirection="row" justifyContent="flex-end" gap={3}>
          {hasChain && (
            <Box flexDirection="row">
              {CHAIN.map((c, i) => (
                <Text key={c.skill} color={chainDone.has(c.skill) ? heat(0) : c === due ? 'claude' : 'inactive'}>
                  {`${i > 0 ? ' › ' : ''}${chainDone.has(c.skill) ? '✓' : c === due ? '▸' : '○'} ${c.label}`}
                </Text>
              ))}
            </Box>
          )}
          {cacheLeft === undefined ? (
            <Text> </Text>
          ) : cacheLeft > 0 ? (
            <Text color={cacheLeft < 10 * 60_000 ? heat(0.5) : heat(0)}>
              {`● cache warm ${fmtDuration(cacheLeft)}`}
            </Text>
          ) : (
            <Text color={heat(1)}>{'○ cache cold: next prompt re-reads the context'}</Text>
          )}
        </Box>
        <Box flexDirection="row" gap={2}>
          {e.props.modes.length > 0 && <Box flexShrink={1}>{inner}</Box>}
          {snap && (
            <Box flexDirection="row" flexShrink={0}>
              <Text color="claude">◆ </Text>
              <Text dimColor>ctx </Text>
              {bar(gauge(ctxShare, width))}
              <Text bold color={heat(ctxShare)}>{` ${Math.round(ctxShare * 100)}%`}</Text>
              <Text dimColor>{` ${tokens(snap.used)}`}</Text>
            </Box>
          )}
          {rows.map(r => (
            <Box key={r.kind} flexDirection="row" flexShrink={0}>
              <Text dimColor>{`${r.short.toLowerCase()} `}</Text>
              {bar(gauge(r.pct / 100, width, r.elapsed))}
              <Text bold color={limitColor(r)}>{` ${Math.round(r.pct)}%`}</Text>
              {r.resetShort ? <Text dimColor>{` ↻ ${r.resetShort}`}</Text> : null}
            </Box>
          ))}
        </Box>
      </Box>
    )
  })
}
