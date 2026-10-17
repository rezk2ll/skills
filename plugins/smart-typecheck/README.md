## What it does

After a turn where Claude edited code, runs `npm run check` once in each package it touched, and toasts if it fails. You find a type error at the end of the turn, not in CI.

## When to use it

- Your packages have a `check` script (`tsc --noEmit`, `svelte-check`, `vue-tsc`, a lint pass).
- You work in a monorepo and only want the packages you changed checked.

## How it works

- Records every successful `Edit` or `Write` to a `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`, `.svelte` or `.vue` file.
- When the main turn ends, walks up from each file to its nearest `package.json` inside the session root. If that package has the script, it is checked once, however many of its files changed.
- Shows the package name in the status line while the check runs (up to 3 minutes), and a toast if it exits non-zero.
- Subagent turns are skipped. Packages without the script are skipped.

## Configuration

Set these with `/config`, or under `pluginConfigs` in your user settings.

- `script` (default `check`): the `package.json` script to run.
- `packageManager` (default `npm`): the command that runs it, as in `<packageManager> run <script>`. Use `pnpm`, `yarn` or `bun` if that is what your repo uses.

## Requirements

- Claude Code 2.1.287 or later.
- The package manager you configure, on your `PATH`.
