// Plain formatting helpers for the status line and the pane. No engine calls here,
// so nothing in this file can fail a session.

/** `68412` as `68.4k`, `1240000` as `1.2M`; small numbers as they are. */
export function tokens(n: number): string {
  const v = Math.round(n)
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (Math.abs(v) >= 100_000) return `${Math.round(v / 1000)}k`
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1)}k`
  return String(v)
}

/** The same, with a sign kept: `+4.2k`, `-1.1k`, `0`. */
export function signed(n: number): string {
  if (Math.round(n) === 0) return '0'
  return n > 0 ? `+${tokens(n)}` : `-${tokens(-n)}`
}

/** Pads or clips `text` to exactly `width` cells. */
export function fit(text: string, width: number): string {
  if (width <= 0) return ''
  if (text.length === width) return text
  if (text.length < width) return text + ' '.repeat(width - text.length)
  return width <= 1 ? text.slice(0, width) : `${text.slice(0, width - 1)}…`
}

/** Right-aligns `text` in `width` cells. */
export function right(text: string, width: number): string {
  return text.length >= width ? text : ' '.repeat(width - text.length) + text
}

/** How many of `width` cells a share of `0..1` fills; a non-zero share always shows one. */
export function filledCells(share: number, width: number): number {
  if (!(share > 0) || width <= 0) return 0
  return Math.min(width, Math.max(1, Math.round(share * width)))
}

const clamp01 = (n: number) => (n > 0 ? Math.min(1, n) : 0)

// green, amber, red: GitHub's dark-theme success, attention and danger
const STOPS: [number, number, number][] = [
  [0x3f, 0xb9, 0x50],
  [0xd2, 0x99, 0x22],
  [0xf8, 0x51, 0x49],
]

/** A share of `0..1` as a hex colour on the green, amber, red ramp. */
export function heat(share: number): string {
  const t = clamp01(share) * (STOPS.length - 1)
  const i = Math.min(STOPS.length - 2, Math.floor(t))
  const [a, b] = [STOPS[i]!, STOPS[i + 1]!]
  const mix = (k: number) => Math.round(a[k]! + (b[k]! - a[k]!) * (t - i))
  return `#${[0, 1, 2].map(k => mix(k).toString(16).padStart(2, '0')).join('')}`
}

export type Cell = { ch: string; color: string }

const EIGHTHS = ['', '▏', '▎', '▍', '▌', '▋', '▊', '▉']
const TRACK = '─'
const MARK = '│'

/**
 * A bar `width` cells wide, filled to `share` in eighths of a cell, each filled cell
 * coloured by its own position on the ramp so a fuller bar runs hotter at its tip.
 * `marker` (0..1) draws a tick on the empty track, as a pace line.
 */
export function gauge(share: number, width: number, marker?: number): Cell[] {
  const eighths = Math.round(clamp01(share) * width * 8)
  const tick = marker === undefined ? -1 : Math.min(width - 1, Math.floor(clamp01(marker) * width))
  const cells: Cell[] = []
  for (let i = 0; i < width; i++) {
    const fill = eighths - i * 8
    const color = heat(width > 1 ? i / (width - 1) : 0)
    if (fill >= 8) cells.push({ ch: '█', color })
    else if (fill > 0) cells.push({ ch: EIGHTHS[fill]!, color })
    else if (i === tick) cells.push({ ch: MARK, color: 'claude' })
    else cells.push({ ch: TRACK, color: 'inactive' })
  }
  return cells
}
