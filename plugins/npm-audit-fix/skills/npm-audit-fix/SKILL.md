---
name: npm-audit-fix
description: Use when the user asks to fix npm audit vulnerabilities, npm audit issues, or vulnerability issues. Walks each Node sub-project, patches what it can, respects per-project allowlists, opens one PR per sub-project.
---

# npm audit fix

Patch npm vulnerabilities. One PR per sub-project, never bundled.

## When to use

- "fix npm audit issues" / "fix vulnerability issues" / "fix npm audit vulns"
- Any variant where the user wants `npm audit` findings cleared

## Allowlist

Some bumps must be skipped because they break a working dependency or have no real upstream fix. Sources, in order:

1. The user's request in the current conversation.
2. A `.claude/audit-allowlist.json` (or similar) in the sub-project or workspace root, if present.
3. The sub-project's CLAUDE.md if it documents one.

Once a skip is established from one of these, apply it without asking. If none of them mention a skip and a bump fails the project's verify step, that finding goes in "Deferred". Do not force it through.

A typical allowlist entry is an advisory where npm's only proposed fix is a bogus downgrade of a parent package (for example to a `0.0.x` release). Do not add an override or any other workaround to clear it.

When the only remaining advisories after `npm audit fix` are allowlisted, stop. Do not override, downgrade, or `--force`. Report them as allowlisted in the PR body and move on.

## Phase 0: Scope

1. Workspace root: `git rev-parse --show-toplevel`.
2. In-scope sub-projects:
   - cwd is the workspace root: every dir containing both `package.json` and `package-lock.json` (use `find -maxdepth 4 -name package-lock.json -not -path '*/node_modules/*'`).
   - cwd is a specific sub-project: that one only.
   - User named sub-projects in the request: only those.

## Phase 1: Fix per sub-project

For each sub-project, in sequence:

1. `npm audit fix`
2. If non-allowlisted findings remain:
   - Direct dep: `npm install <pkg>@<patched-version>`
   - Transitive: add an `overrides` entry in `package.json`
3. `npm install` to refresh the lockfile.
4. `npm audit` once more. Confirm only allowlisted findings remain.

Never use `npm audit fix --force` without verifying in Phase 2.

## Phase 2: Verify per sub-project

Run whichever of these the sub-project's `package.json` actually defines, in this order:

```
format → check → typecheck → lint → build → test
```

Skip scripts that are not defined. Skip `test` if it needs services (docker, a message broker, a directory server) that are not running locally; note that in the PR body.

If any check fails because of a specific bump, roll back THAT bump and move it to Deferred.

## Phase 3: PR per sub-project

- One branch and one PR per sub-project. Never combine.
- Branch: `chore/npm-audit-<sub-project>` (or `chore/npm-audit-root` when the sub-project is the workspace root itself).
- Match the sub-project's existing commit prefix style. Check `git log --oneline -10` in that sub-project before committing.
- PR title: short, in the repo's commit style. PR body is a few plain bullets, no test plan section, no file list:
  - Patched <N> vulnerabilities
  - Upgraded packages with new versions
  - Allowlisted findings intentionally skipped (with reason)
  - Deferred findings (requires major upgrade, separate work)

The body contains backticks, so write it to a temp file with the Write tool and pass `--body-file`. Never put backticks inside a `--body "..."` string: shell substitution escapes them and breaks the Markdown.

```bash
gh pr create --title "<title>" --body-file <temp-dir>/pr-body.md
```

## Rules

- One PR per sub-project. Never bundle.
- Honor the allowlist without prompting once it's established.
- Never use `--force` without re-running verify after.
- Never commit a state where the audit is worse than baseline.
- Never add `--legacy-peer-deps` unless the project's CI already does.
- Keep the diff limited to audit-driven changes; no incidental cleanup.
