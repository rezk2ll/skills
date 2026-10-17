import type { Register } from 'claude-code'

const kilo = (n: number) => `${Math.round(n / 1000)}K`

export const register: Register = (on, options) => {
  const warnAt = Number(options.warnAt) || 200_000
  let hasWarned = false

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    if (e.agentId !== undefined) {
      return result
    }

    const { context, cost } = await $.session.usage()
    const tokens = context.tokens ?? 0
    const spend = cost ? ` · $${cost.usd.toFixed(2)}` : ''

    $.ui.status(`ctx ${kilo(tokens)}${spend}`)

    if (tokens >= warnAt && !hasWarned) {
      hasWarned = true
      $.ui.toast(`Context at ${kilo(tokens)}: consider /compact or /clear`)
    }
    if (tokens < warnAt) {
      hasWarned = false
    }

    return result
  })
}
