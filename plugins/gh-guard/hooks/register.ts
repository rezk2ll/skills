import type { Register } from 'claude-code'

const OVERRIDE = '# gh-go'

const GH_WRITE = [
  /\bgh\s+(pr|issue)\s+comment\b/,
  /\bgh\s+pr\s+review\b/,
  /\bgh\s+api\b(?=.*(comments|reviews|replies))(?=.*(-X\s*(POST|PATCH|PUT|DELETE)|--method\s+(POST|PATCH|PUT|DELETE)|\s-[fF]\s|--field|--raw-field|--input))/s,
]

const MCP_WRITE = /^mcp__.*github.*__(add_issue_comment|add_reply_to_pull_request_comment|add_comment_to_pending_review|pull_request_review_write|update_issue_comment)$/

const REASON = `gh-guard: this posts on GitHub as the user. Show the exact text in chat and wait for their explicit go. Once they give it, rerun the gh command with "${OVERRIDE}" appended.`

export const register: Register = on => {
  on('tool.call', ($, e, next) => {
    if (e.tool === 'Bash') {
      const isWrite = GH_WRITE.some(re => re.test(e.command))
      return isWrite && !e.command.includes(OVERRIDE) ? { deny: REASON } : next(e)
    }

    return MCP_WRITE.test(e.tool) ? { deny: REASON } : next(e)
  })
}
