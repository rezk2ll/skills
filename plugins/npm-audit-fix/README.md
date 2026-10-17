## What it does

The skill clears `npm audit` findings in every Node sub-project of a repo, one sub-project at a time. It fixes what it can, verifies with the project's own scripts, and opens one PR per sub-project. Findings that would break the build or that you allowlisted stay out of the PR and are listed in its body.

## When to use it

- "Fix npm audit issues" or "fix the vulnerability alerts".
- A monorepo with several `package-lock.json` files that each need their own PR.

## How it works

- Runs `npm audit fix`, then pins direct deps or adds `overrides` for transitive ones.
- Verifies with whichever of `format`, `check`, `typecheck`, `lint`, `build`, `test` the project defines, and rolls back a bump that breaks them.
- Reads skips from your request, a `.claude/audit-allowlist.json`, or the project's CLAUDE.md. It never uses `--force` or a fake downgrade to clear an allowlisted advisory.
- Opens `chore/npm-audit-<sub-project>` branches with a short PR body: patched, upgraded, allowlisted, deferred.

## Requirements

- `npm` and the GitHub CLI (`gh`), authenticated.
