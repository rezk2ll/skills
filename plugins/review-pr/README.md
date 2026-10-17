## What it does

`review-pr` reviews someone else's pull request and writes the review to a local Markdown file. It never posts anything. You read the draft and decide what to send.

## When to use it

- You are asked to review a PR and want a careful first pass: "review PR 412".
- You want every finding backed by a concrete failure scenario and a link to the exact lines.

## How it works

- Pins the PR head commit, so every link in the review survives a force-push.
- Reads the changed files in full, then their callers and dependencies, and runs the project's tests on the head in a worktree.
- Turns each finding into inputs or state, then the wrong outcome. A finding without one becomes a question.
- Writes `pr-<n>-review.md` to the session scratchpad: a header, a two-paragraph verdict, then Blocking, Worth fixing, Nits and Questions.
- For comments on your own PR, use the `pr-address-comments` plugin instead.

## Requirements

- `git` and the GitHub CLI (`gh`), authenticated.
