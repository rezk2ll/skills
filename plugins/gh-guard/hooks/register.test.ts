import { expect, test } from 'claude-code/testing'

const ran = { result: { stdout: 'ok', stderr: '', interrupted: false }, text: 'ok' } as never

const blocked = [
  'gh pr comment 12 --body "hi"',
  'gh issue comment 3 -b x',
  'gh pr review 12 --approve',
  'gh api repos/o/r/pulls/1/comments -X POST -f body=x',
  'gh api repos/o/r/issues/comments/9 --method PATCH -f body=x',
]

const allowed = [
  'gh pr view 12',
  'gh pr create --title t --body-file b',
  'gh api repos/o/r/pulls/1/comments',
  'gh pr comment 12 --body "hi" # gh-go',
]

for (const command of blocked) {
  test(`blocks: ${command}`, async ($, on) => {
    on('tool.call', () => ran)
    const out = await $.tool.call({ tool: 'Bash', command })
    expect(out.deny).toContain('gh-guard')
  })
}

for (const command of allowed) {
  test(`allows: ${command}`, async ($, on) => {
    on('tool.call', () => ran)
    const out = await $.tool.call({ tool: 'Bash', command })
    expect(out.deny).toBeUndefined()
  })
}

test('blocks the GitHub MCP comment tool', async ($, on) => {
  on('tool.call', () => ran)
  const out = await $.tool.call({ tool: 'mcp__plugin_github_github__add_issue_comment', owner: 'o', repo: 'r', issue_number: 1, body: 'x' })
  expect(out.deny).toContain('gh-guard')
})
