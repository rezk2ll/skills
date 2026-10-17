## What it does

`pr-address-comments` pulls the open review comments on your pull request, fixes the ones that ask for a concrete change, and pushes to the PR branch. It never replies, resolves threads, reacts, or posts anything on GitHub. Questions and disagreements come back to you in the report.

## When to use it

- "Address the review feedback on PR 123."
- "Check the comments on my PR and fix what you can."

## How it works

- Finds the PR for the current branch and checks it out.
- Pulls review threads with one GraphQL call, then review summaries and conversation comments. It drops resolved, outdated and self-authored comments.
- Sorts each comment as actionable, nit, question, out of scope or disagreement, and fixes only inside the comment's scope.
- Runs the project's own checks, folds each fix into the commit it belongs to, and pushes with `--force-with-lease`.
- Reports what it fixed, what it skipped, and what needs your reply.

## Requirements

- `git` and the GitHub CLI (`gh`), authenticated.
