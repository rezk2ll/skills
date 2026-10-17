---
name: github-work
description: Use when the user asks to work through their assigned GitHub issues, iterate through their backlog, or resolve open issues one by one. Picks up EXISTING open issues assigned to the user, fixes each, and opens a PR that closes the issue on merge. NOT for finding new issues.
---

Fetches open issues from a GitHub repository that are assigned to the user, then resolves them one at a time by creating a pull request for each.

## Issue Selection

1. Fetch all open issues assigned to the current user:
   ```bash
   gh issue list --assignee @me --state open --json number,title,labels
   ```
2. Process issues in priority order: `blocker` > `high-priority` > `medium-priority` > `code-quality`/unlabeled
3. If no priority labels exist, process by oldest first (lowest issue number)

## Per-Issue Workflow

For each issue, follow these steps in order:

### 1. Clean state
- Find the default branch: `gh repo view --json defaultBranchRef --jq .defaultBranchRef.name`. Do not assume `main`
- Ensure you're on the default branch with a clean working tree
- Pull latest: `git pull origin <default-branch>`

### 2. Branch
- Create a new branch named after the issue: `git checkout -b fix/NNN-short-description` (e.g., `fix/922-csrf-protection`)

### 3. Implement
- Read the issue description carefully: understand the problem, impact, and suggested fix
- Make the necessary changes to fix the issue
- Write or update tests to cover the changes
- Use `isolation: "worktree"` when launching subagents (Agent tool) to prevent changes from leaking between issues

### 4. Review agent
- Launch a strict review subagent to check the changes:
  - No new issues or regressions introduced
  - Code follows existing project patterns and conventions
  - Error handling is complete
  - No unnecessary changes beyond the issue scope

### 5. Test agent
- Launch a test subagent to:
  - Run the full test suite and verify all tests pass
  - Verify new/updated tests are meaningful and cover the changes
  - Run linters and type-checkers if available

### 6. Fix feedback
- Address all issues found by the review and test agents
- Keep iterating on review+fix rounds until all problems are resolved. Do not skip or abandon issues

### 7. Commit
- Follow the repository's existing commit message convention (check `git log --oneline -10` for patterns)
- If no convention exists, use conventional commits: `fix(scope): description` or `feat(scope): description`
- Stage only relevant files. Never `git add -A` blindly

### 8. Push and create PR
- Push the branch: `git push -u origin <branch-name>`
- Create a PR linking it to the issue:
  - Keep the PR description concise: no verbose test plans or agent output
  - Use `Closes #NNN` or `Fixes #NNN` in the PR body so GitHub auto-closes the issue on merge
  - Do **NOT** manually close the issue. Let the merge handle it

### 9. Reset for next issue
- Switch back to the default branch: `git checkout <default-branch>`
- Pull latest: `git pull origin <default-branch>`
- Then start the next issue

## PR Body Template

```
## Summary
- <1-3 bullet points describing what changed and why>

Closes #NNN
```

Do not include: test output, agent review logs, implementation details that are obvious from the diff.

## GitHub CLI: Markdown in PR bodies

Backticks inside a `--body "..."` string get escaped by the shell (`\``) and break the rendered markdown. Never put backticks directly in `--body`.

Preferred: write the body to a temp file with the Write tool (it preserves backticks exactly), then pass it with `--body-file`:

```bash
gh pr create --title "Title" --body-file /tmp/pr-body.md
```

Alternative: a heredoc with a single-quoted delimiter, which turns off all shell interpolation:

````bash
gh pr create --title "Title" --body "$(cat <<'EOF'
The code in `file.ts` now does this.

Closes #NNN
EOF
)"
````
