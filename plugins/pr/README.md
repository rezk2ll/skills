## What it does

`/pr` stages your change, commits it, pushes a branch, and opens a pull request with `gh`. The skill carries an opinionated set of PR writing rules: the body says why, most bodies are one line, and the PR holds only the files and commits that belong to the change.

## When to use it

- You have local changes and want a branch and a PR in one step.
- You want PR bodies that read like a teammate wrote them, not a template.
- You pass an optional branch name hint: `/pr add-annual-plans`.

## How it works

- Picks a `feat/`, `fix/` or `chore/` branch, stages files by path, and keeps scratch docs and stray local commits out of the PR.
- Splits changes over 400 reviewable lines into commits you can read one at a time, and says so in the body.
- Writes the body by these rules: focus on why; a feature is not a fix; no Test plan section; no file lists or checklists; no em dashes, en dashes or double hyphens; no internal references like "based on X".
- Uses `## Context` and `## Solution` only for real fixes. ADR PRs carry the full ADR. npm audit PRs get a short outcome list.
- Checks the pushed PR's file list and fixes the branch if something unintended slipped in.

## Requirements

- `git` and the GitHub CLI (`gh`), authenticated.
- Optional: the [humanizer](https://github.com/blader/humanizer) skill. When it is installed, the draft body goes through it before posting. Without it, the skill skips that step.
- Optional: the `review-chain` plugin from this repo, if you want hooks to enforce a review chain and the large-diff rule before `gh pr create`. The skill works without it.
