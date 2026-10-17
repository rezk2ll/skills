---
name: start
description: Switch to the repo's default branch, pull latest, create a branch from the task description, clear context, and start working
---

Prepare a clean branch and immediately start working on a task. `$ARGUMENTS` is the task description (e.g., "the login form has a broken layout on mobile").

## Steps

1. Determine the repo's default branch. Do not assume `main` (some repos use `master` or something else):
   ```
   git remote set-head origin --auto >/dev/null 2>&1
   DEFAULT_BRANCH=$(git symbolic-ref --short refs/remotes/origin/HEAD | sed 's@^origin/@@')
   ```
   If that leaves `DEFAULT_BRANCH` empty (no `origin` remote configured), fall back to the current branch: `DEFAULT_BRANCH=$(git rev-parse --abbrev-ref HEAD)`.
2. Switch to the default branch and pull latest:
   ```
   git checkout "$DEFAULT_BRANCH" && git pull
   ```
3. Derive a short branch name from the task description. Use `fix/...`, `feat/...`, or `chore/...` prefix based on the nature of the task. Keep it under 4 words, lowercase, kebab-case.
4. Create the branch:
   ```
   git checkout -b <derived-branch-name>
   ```
5. Run `/clear` to reset conversation context.
6. Start working on the task described in `$ARGUMENTS` right away. Do not ask what to do, just begin.
