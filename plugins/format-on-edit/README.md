## What it does

Formats and lints every file Claude writes or edits, with the tools the project already has. Lint errors left after autofix go back to Claude, so it can fix them in the same turn.

## When to use it

- You want Claude's edits to match your formatter without asking for it.
- You want lint errors caught at edit time, not in CI.

## How it works

- Runs after `Write` and `Edit`, only on files inside a git repo.
- Looks for `prettier` and `eslint` in the nearest `node_modules/.bin`, walking up from the file, so each sub-project of a monorepo uses its own version.
- Prettier formats JS, TS, Svelte, Vue, JSON, CSS, Markdown and YAML. ESLint runs with `--fix` on JS, TS, Svelte and Vue.
- Python uses `ruff format` and `ruff check --fix`, Go uses `gofmt`, Rust uses `rustfmt`, PHP uses `vendor/bin/php-cs-fixer`, when they are installed.
- Errors left after the fix make the hook exit 2 with the list, so Claude sees them.

## Requirements

- `jq` and `git`. The formatters and linters are optional: a missing tool is skipped.
