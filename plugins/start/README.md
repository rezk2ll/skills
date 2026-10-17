## What it does

`/start <task>` gets you onto a fresh branch for a new task and starts working on it. It finds the repo's default branch, pulls it, cuts a short branch named from your description, clears the context, and begins without asking what to do.

## When to use it

- You are about to start a new task: `/start the login form breaks on mobile`.
- You want every task on a clean branch from an up-to-date default branch.

## How it works

- Detects the default branch from `origin/HEAD` instead of assuming `main`, and falls back to the current branch when there is no `origin`.
- Names the branch with a `fix/`, `feat/` or `chore/` prefix, under four words, kebab-case.

## Requirements

- `git`.
