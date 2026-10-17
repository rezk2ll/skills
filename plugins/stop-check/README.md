## What it does

Keeps Claude from ending a turn while a JavaScript or TypeScript project it changed fails its typecheck or the tests related to the changed files. Claude gets the failing output and keeps working.

## When to use it

- You want "done" to mean the typecheck and the related tests pass.
- You work in monorepos where each sub-project has its own `package.json`.

## How it works

- Runs on `Stop`. Collects JS, TS, Svelte and Vue files changed on the branch (against `origin/HEAD`) plus untracked ones, and groups them by nearest `package.json`.
- Per project it runs the first script it finds among `typecheck`, `check` and `lint`, then `vitest related` or `jest --findRelatedTests` on the changed files.
- A passing state is cached by content hash, so a turn that changes nothing costs nothing.
- A project without `node_modules` is skipped with a warning, not a block.
- After 3 blocked attempts in a session it stops blocking and tells Claude to report the failure to you.

## Configuration

- `STOP_CHECK_MAX_ATTEMPTS`: blocked attempts before it gives up. Default `3`.
- `STOP_CHECK_DIR`: cache and counter directory. Default `${TMPDIR:-/tmp}/claude-stop-check`.

## Requirements

- `git`, `jq`, `npm`. Related tests need `vitest` or `jest` installed in the project.
