import { expect, test } from 'claude-code/testing'

const readResult = { result: { type: 'text', file: { filePath: '', content: '', numLines: 0, startLine: 1, totalLines: 1 } }, text: '' } as never

const statOf = (size: number) => ({ value: { kind: 'file' as const, size, mtimeMs: 0, isLink: false } })

test('caps an unbounded read of a large file and says so', async ($, on) => {
  let seenLimit: number | undefined
  on('fs.stat', () => statOf(100_000))
  on('tool.call', ($, e) => {
    if (e.tool === 'Read') seenLimit = e.limit
    return readResult
  })

  const out = await $.tool.call({ tool: 'Read', file_path: 'big.ts' })

  expect(seenLimit).toBe(400)
  expect(out.context?.join('\n')).toContain('read-guard')
})

test('leaves a small file and an explicit range alone', async ($, on) => {
  const limits: (number | undefined)[] = []
  on('fs.stat', () => statOf(500))
  on('tool.call', ($, e) => {
    if (e.tool === 'Read') limits.push(e.limit)
    return readResult
  })

  await $.tool.call({ tool: 'Read', file_path: 'small.ts' })
  await $.tool.call({ tool: 'Read', file_path: 'big.ts', offset: 1, limit: 20 })

  expect(limits).toEqual([undefined, 20])
})
