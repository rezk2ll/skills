## What it does

`github-work` works through the open GitHub issues assigned to you, one at a time. For each issue it branches, fixes, runs a review agent and a test agent until both are clean, and opens a PR that closes the issue on merge.

## When to use it

- "Work through my assigned issues."
- "Go through my backlog and fix them one by one."

It only picks up existing issues. It does not look for new ones.

## How it works

- Lists your open issues with `gh issue list --assignee @me` and orders them by priority label (`blocker`, `high-priority`, `medium-priority`), then oldest first.
- Starts each issue from a clean, freshly pulled default branch on a `fix/<number>-<slug>` branch.
- Loops review and test subagents until they find nothing, then commits in the repo's existing style.
- Opens the PR with `Closes #<number>` and a short summary, and lets the merge close the issue.
- Passes PR bodies through `--body-file` or a quoted heredoc so backticks render.

## Requirements

- `git` and the GitHub CLI (`gh`), authenticated.
