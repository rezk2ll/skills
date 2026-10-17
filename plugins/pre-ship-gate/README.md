## What it does

Refuses a `git commit` or `gh pr create` that a reviewer cannot follow. It catches moves or generated files mixed with logic, new npm dependencies, source changes without tests, and PRs too large to review in one sitting. Each refusal says what to fix.

## When to use it

- You want Claude to split mechanical changes from logic changes on its own.
- You want new dependencies justified before they land.
- You want large PRs split into commits with a stated reading order.

## How it works

- On `git commit` it checks the staged diff. On `gh pr create` it checks the branch against `origin/HEAD` (or `origin/main`, `origin/master`, `origin/develop`).
- Mixed change: renamed files or generated files (`dist/`, `build/`, `*.min.js`, `*_pb2.py` and similar) next to source files. Lockfiles do not count, since a dependency bump touches the manifest and its lock together.
- New dependency: a key added to `dependencies` or `devDependencies` in any `package.json`.
- No tests (PR only): a sub-project with a `test` script changed but none of its test files did.
- Size (PR only): reviewable lines, without lockfiles, generated files and docs. Over the limit, each commit must stay under it and the PR body must name the reading order.
- Review chain (PR only): with the `review-chain` plugin installed, the PR is refused until the review skills ran in this session. Docs only PRs need `humanizer` instead.

## Configuration

- `SHIP_MAX_SEMANTIC_LINES`: size limit in reviewable lines. Default `400`.
- `SHIP_REVIEW_CHAIN`: `auto` (default) enforces the review chain once the `review-chain` state dir exists, `1` always enforces it, `0` turns it off.
- `REVIEW_CHAIN_REQUIRED`, `REVIEW_CHAIN_DOCS`, `REVIEW_CHAIN_DIR`: shared with the `review-chain` plugin. Defaults `code-review ponytail-review comment-cleanup`, `humanizer`, `${TMPDIR:-/tmp}/claude-review-chain`.

## Overrides

- `# ship-override: <reason>`: append it to the commit or PR command to ship anyway. The reason stays in the transcript.

## Requirements

- `git`, `jq`, and GNU `grep` (the `-P` flag reads `--body` from the command).
- Optional: the `review-chain` plugin from this repo for the review chain check, and `humanizer` (`blader/humanizer`) for docs only PRs.
