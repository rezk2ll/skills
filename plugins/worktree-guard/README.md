## What it does

Refuses edits in a repo's main checkout while another live Claude session works there, and tells Claude to move to a git worktree. Without it, two sessions in one checkout write into each other's diff.

## When to use it

- You run several Claude sessions on the same repo at once.
- You keep one session in the main checkout and send the others to worktrees.

## How it works

- Runs before `Edit`, `Write` and `NotebookEdit`, and before `Bash` commands that move the checkout (`git checkout`, `switch`, `pull`, `rm`, `mv`, `stash`, `reset`, `rebase`, `merge`).
- Finds other sessions in Claude Code's session registry and keeps those whose process is alive and whose working directory is the main checkout.
- Files at the repo root and files inside the worktree directory are always allowed.

## Configuration

- `WORKTREE_GUARD_DIR`: worktree directory, relative to the repo root. Default `.claude/worktrees`.
- `WORKTREE_GUARD_SESSIONS`: session registry directory. Default `${CLAUDE_CONFIG_DIR:-$HOME/.claude}/sessions`.

There is no override token. Move the other session or work in a worktree.

## Requirements

- `git` (2.31 or later for `--path-format`) and `jq`.
