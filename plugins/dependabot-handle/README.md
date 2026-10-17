## What it does

The skill triages every open Dependabot PR in the current repo. It merges green PRs whose diff only touches manifests and lockfiles, closes failing ones with a short human comment, and skips anything pending or touching other files. You confirm the plan before it acts.

## When to use it

- Dependabot PRs have piled up and you want them cleared in one pass.
- You want failing bumps closed with a reason instead of left open.

## How it works

- Lists PRs by `app/dependabot`, reads `gh pr checks` and `gh pr diff` for each.
- Shows a table of merge, close and skip with reasons, then asks: all, merge only, or pick.
- Squash-merges, and closes with a comment that says what failed and why, without raw logs.

## Requirements

- The GitHub CLI (`gh`), authenticated with rights to merge and close PRs.
