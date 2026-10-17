---
name: dependabot-handle
description: Triages open Dependabot PRs. Merges clean bumps, closes broken ones, skips pending.
---

Triage all open Dependabot PRs in the current repository. Merge the safe ones, close the broken ones with a clear explanation, and skip anything that needs human attention.

## Phase 1: Discover Dependabot PRs

List all open PRs authored by Dependabot:
```bash
gh pr list --author "app/dependabot" --state open --json number,title,headRefName
```

If none found, report "No open Dependabot PRs" and stop.

## Phase 2: Evaluate each PR

Process PRs in order. For each PR:

### 1. Check CI status

```bash
gh pr checks <number>
```

- **Pending**: skip the PR entirely (report as "checks still running")
- **All pass**: proceed to sanity review
- **Any failure**: mark for closing (note which checks failed)

### 2. Quick sanity review (only if CI passed)

Read the diff:
```bash
gh pr diff <number>
```

Verify the PR is a straightforward dependency bump:
- Only lockfile and manifest changes (e.g., `package.json`, `pom.xml`, `build.gradle`, `Cargo.toml`, `go.mod`, and their lockfiles)
- No application code, config files, or anything beyond dependency files

If the diff touches anything else, **skip** the PR. It needs human review.

### 3. Classify action

- CI passes and the diff is a clean dependency bump: **Merge**
- CI failed: **Close with comment**
- Checks pending: **Skip**
- Diff touches non-dependency files: **Skip** (needs human review)

## Phase 3: User confirmation

Before taking any action, present a summary table:

```
| PR | Title | Action | Reason |
|----|-------|--------|--------|
| #42 | Bump eslint 8→9 | Merge | CI green, clean bump |
| #43 | Bump vite 5→6 | Close | CI failed: type errors in build |
| #44 | Bump axios 1.6→1.7 | Skip | Checks still pending |
```

Then ask the user which actions to take using AskUserQuestion:
- "Proceed with all actions" (Recommended)
- "Only merge passing PRs (don't close failing ones)"
- "Let me pick individually"

If the user picks individually, present a multiSelect list of all actionable PRs (exclude skipped ones).

## Phase 4: Execute actions

### Merge
```bash
gh pr merge <number> --squash
```

### Close with comment

Write the comment body to a temp file with the Write tool, then close:
```bash
gh pr comment <number> --body-file <temp-dir>/close-comment.md && gh pr close <number>
```

The close comment must be human-readable and concise:

> Closing this PR because CI checks failed:
>
> - **Build**: type errors introduced by the new version
> - **Tests**: 3 test failures in auth module
>
> This dependency update isn't compatible with the current codebase without code changes.

No raw logs, no file lists, no code snippets. Just what failed and why the bump can't be auto-merged.

## Phase 5: Summary

Report final results: what was merged, closed, and skipped, with PR numbers and URLs.

## GitHub CLI: Markdown in comments

Shell substitution escapes backticks inside `--body "..."` strings, which breaks the Markdown. Always pass bodies with `--body-file`, or with a heredoc that uses a single-quoted delimiter (`<<'EOF'`), which disables all interpolation:

```bash
gh pr comment <number> --body "$(cat <<'EOF'
The new version needs `node >= 20`.
EOF
)"
```

Never write escaped backticks (`` \` ``) inside a `--body` string.
