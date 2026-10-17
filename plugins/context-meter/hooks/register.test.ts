import { expect, test } from 'claude-code/testing'

const turn = { answer: 'done', durationMs: 1, isAborted: false, turnId: 't', reason: 'answer' as const }

test('shows context and cost, and toasts once past 200K', async ($, on) => {
  const statuses: (string | undefined)[] = []
  const toasts: string[] = []
  let tokens = 250_000
  on('session.usage', () => ({ value: { startedAt: 0, context: { tokens, window: 1_000_000 }, rateLimits: [], cost: { usd: 1.5 } } }))
  on('ui.status', (_, e) => (statuses.push(e.text), { value: undefined }))
  on('ui.toast', (_, e) => (toasts.push(e.text), { value: undefined }))
  on('turn.complete', () => ({ text: 'done' }))

  await $.turn.complete(turn)
  await $.turn.complete(turn)
  tokens = 50_000
  await $.turn.complete(turn)

  expect(statuses).toEqual(['ctx 250K · $1.50', 'ctx 250K · $1.50', 'ctx 50K · $1.50'])
  expect(toasts.length).toBe(1)
})
