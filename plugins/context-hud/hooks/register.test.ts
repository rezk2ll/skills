import { expect, test } from 'claude-code/testing'

const turn = { answer: 'done', durationMs: 1, isAborted: false, turnId: 't', reason: 'answer' as const }

test('pins no status notice and toasts once past 200K', async ($, on) => {
  const statuses: (string | undefined)[] = []
  const toasts: string[] = []
  let used = 250_000
  on('session.usage', () => ({
    value: { startedAt: 0, context: { tokens: used, window: 1_000_000, percent: Math.round(used / 10_000) }, rateLimits: [], cost: { usd: 1 } },
  }))
  on('ui.status', (_, e) => (statuses.push(e.text), { value: undefined }))
  on('ui.toast', (_, e) => (toasts.push(e.text), { value: undefined }))
  on('turn.complete', () => ({ text: 'done' }))

  await $.turn.complete(turn)
  await $.turn.complete(turn)
  used = 50_000
  await $.turn.complete(turn)
  used = 210_000
  await $.turn.complete(turn)

  expect(statuses).toEqual([])
  expect(toasts).toEqual(['Context at 250k: consider /compact or /clear', 'Context at 210k: consider /compact or /clear'])
})
