## What it does

Stops Claude from posting on GitHub as you without your say-so. Any comment, review or reply goes through only after you approve the exact text and Claude reruns the command with a go token.

## When to use it

- You let Claude work through PRs and issues with `gh` or the GitHub MCP server, and you want every public word under your name to be one you saw first.
- You want draft replies in the chat, not on the PR.

## How it works

- Denies `gh pr comment`, `gh issue comment` and `gh pr review`.
- Denies `gh api` calls that write to a `comments`, `reviews` or `replies` endpoint (`-X POST/PATCH/PUT/DELETE`, `--method`, `-f`, `-F`, `--field`, `--raw-field`, `--input`). Reads through `gh api` pass.
- Denies the GitHub MCP tools that comment or review: `add_issue_comment`, `add_reply_to_pull_request_comment`, `add_comment_to_pending_review`, `pull_request_review_write`, `update_issue_comment`.
- The deny message tells Claude to show you the exact text and wait for your explicit go.
- Once you say go, Claude reruns the same `gh` command with `# gh-go` appended, for example `gh pr comment 12 --body-file reply.md # gh-go`. The shell treats it as a comment, so the command runs unchanged.
- The MCP tools have no token. Use `gh` for anything you approve.
- `gh pr create` and other non-comment writes are not blocked.

## Requirements

- Claude Code 2.1.287 or later.
