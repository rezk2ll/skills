---
name: pr-address-comments
description: Use when the user asks to check, review, address, or fix comments on a pull request. Pulls review threads, fixes what is actionable locally, pushes to the PR branch. NEVER replies, resolves, or posts anything to GitHub.
---

# Address PR Comments

Pull review comments on a PR, fix what is actionable, push. Never write to GitHub.

## When to use

- "check the comments on the PR" / "address the review feedback" / "fix the comments on PR #123"

## Iron rule: never write to GitHub

Allowed writes: local file edits, local commits, `git push` to the PR's own branch.

Forbidden: `gh pr review`, `gh pr comment`, `gh api -X POST` on `/comments` / `/reviews`, emoji reactions, thread resolution, re-requesting review, PR title / body edits unless the user asked.

If a comment seems to need a verbal reply, surface it in the report instead. The user replies themselves.

## Phase 0: Identify the PR

```bash
gh pr view --json number,headRefName,baseRefName,url,state
```

If the current branch has no PR, ask. If the PR is closed/merged, stop. Otherwise:

```bash
gh pr checkout <number>
```

## Phase 1: Pull comments

One GraphQL call covers most of what you need:

```bash
gh api graphql -f query='
  query($owner: String!, $repo: String!, $number: Int!) {
    repository(owner: $owner, name: $repo) {
      pullRequest(number: $number) {
        reviewThreads(first: 100) {
          nodes {
            isResolved
            comments(first: 20) {
              nodes { body path line author { login } createdAt }
            }
          }
        }
      }
    }
  }' -f owner=<owner> -f repo=<repo> -F number=<number>
```

Then top-level review summaries and PR conversation comments:

```bash
gh api repos/<owner>/<repo>/pulls/<n>/reviews --paginate
gh api repos/<owner>/<repo>/issues/<n>/comments --paginate
```

Filter out: comments by the PR author themselves, resolved threads, outdated inline comments (null `position`), bot comments unless relevant.

## Phase 2: Triage

For each remaining comment, classify:

- **Actionable**: concrete change requested → fix locally
- **Nit**: style preference → fix if cheap, skip otherwise
- **Question**: surface to the user, do not answer on GitHub
- **Out of scope**: valid but separate PR; surface to the user
- **Disagreement**: surface to the user, do not "compromise" by half-fixing

## Phase 3: Apply fixes and verify

1. Make each change inside the comment's scope. No "while I'm here" cleanup.
2. Run the sub-project's own checks. For a Node project, run whichever of these its `package.json` actually defines, in this order: `format → check → typecheck → lint → build → test`. Skip what is not defined. Other stacks: use their equivalent (Makefile targets, `cargo`, `go`, `pytest`).
3. Fix any new failures introduced by your edits before committing.

## Phase 4: Commit and push

Fold the fixes into the existing history rather than stacking an "address review feedback" commit. Squash each fix into the commit it logically belongs to (or amend HEAD when they all belong there), then force-push with lease:

```bash
git commit --amend --no-edit                              # all fixes belong on HEAD
# or, to target an earlier commit (non-interactive autosquash):
git commit --fixup <sha> && GIT_SEQUENCE_EDITOR=: git rebase -i --autosquash <sha>^

git push --force-with-lease
```

Always use `--force-with-lease`, never a bare `--force`, so a teammate's push is never clobbered. Keep the sub-project's existing commit prefix style (`git log --oneline -10`).

## Phase 5: Report (inline)

```
## PR #<n> comment review

**Comments**: <count after filtering>

**Fixed**:
- <file>:<line>: <one-line summary>

**Not addressed** (nit / out of scope):
- <file>:<line>: <reason>

**Needs your input** (do not reply on GitHub):
- <reviewer> asked: "<quoted question>"

**Pushed**: <commit sha> to <branch>
```

## Rules

- The Iron rule covers all GitHub-write prohibitions; do not invent more.
- Scope to each comment. No incidental refactors.
- Run the sub-project's defined verify scripts before pushing.
- Surface questions and disagreements; never engage on GitHub for the user.
