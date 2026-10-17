import { expect, test } from 'claude-code/testing'

import { gauge, heat } from './format'

test('heat runs green to amber to red', async () => {
  expect(heat(0)).toBe('#3fb950')
  expect(heat(0.5)).toBe('#d29922')
  expect(heat(1)).toBe('#f85149')
  expect(heat(7)).toBe('#f85149')
})

test('gauge fills in eighths and ticks the pace on the empty track', async () => {
  const text = (share: number, marker?: number) => gauge(share, 8, marker).map(c => c.ch).join('')
  expect(text(0)).toBe('────────')
  expect(text(1)).toBe('████████')
  expect(text(0.5)).toBe('████────')
  expect(text(0.3)).toBe('██▍─────')
  expect(text(0.25, 0.75)).toBe('██────│─')
  expect(text(0.9, 0.5)).toBe('███████▎')
})
