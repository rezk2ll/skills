import { expect, test } from 'claude-code/testing'

const turn = { answer: 'done', durationMs: 1, isAborted: false, turnId: 't', reason: 'answer' as const }
const edited = { result: { filePath: '', oldString: '', newString: '', originalFile: '', structuredPatch: [], userModified: false, replaceAll: false }, text: '' } as never

test('checks only the sub-project that was edited, and only once', async ($, on) => {
  const runs: (string | undefined)[] = []
  const toasts: string[] = []
  on('session.root', () => ({ value: '/repo' }))
  on('fs.exists', (_, e) => ({ value: e.path === '/repo/dashboard/package.json' }))
  on('fs.read', () => ({ value: JSON.stringify({ scripts: { check: 'svelte-check' } }) }))
  on('process.run', (_, e) => (runs.push(e.init?.cwd), { value: { exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }))
  on('ui.status', () => ({ value: undefined }))
  on('ui.toast', (_, e) => (toasts.push(e.text), { value: undefined }))
  on('tool.call', () => edited)
  on('turn.complete', () => ({ text: 'done' }))

  await $.tool.call({ tool: 'Edit', file_path: '/repo/dashboard/src/a.ts', old_string: 'a', new_string: 'b' })
  await $.tool.call({ tool: 'Edit', file_path: '/repo/dashboard/README.md', old_string: 'a', new_string: 'b' })
  await $.turn.complete(turn)
  await $.turn.complete(turn)

  expect(runs).toEqual(['/repo/dashboard'])
  expect(toasts).toEqual(['check failed in dashboard: run npm run check'])
})

test('runs the configured script with the configured package manager', { options: { script: 'typecheck', packageManager: 'pnpm' } }, async ($, on) => {
  const commands: string[][] = []
  on('session.root', () => ({ value: '/repo' }))
  on('fs.exists', (_, e) => ({ value: e.path === '/repo/package.json' }))
  on('fs.read', () => ({ value: JSON.stringify({ scripts: { typecheck: 'tsc --noEmit' } }) }))
  on('process.run', (_, e) => (commands.push([...e.argv]), { value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }))
  on('ui.status', () => ({ value: undefined }))
  on('tool.call', () => edited)
  on('turn.complete', () => ({ text: 'done' }))

  await $.tool.call({ tool: 'Write', file_path: '/repo/src/a.ts', content: 'x' })
  await $.turn.complete(turn)

  expect(commands).toEqual([['pnpm', 'run', 'typecheck']])
})
