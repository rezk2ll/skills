---
name: review-pr
description: Review someone else's pull request and write the review as a draft file. Use when the user asks to review a PR by number or link. For comments on the user's own PR, use pr-address-comments.
---

# Review a PR

The review is a draft for the user. Posting it is theirs to decide: never run `gh pr review`, `gh pr comment`, or any GitHub write.

1. **Pin the head.** `gh pr view <n> --json title,author,baseRefName,headRefName,headRefOid,closingIssuesReferences,statusCheckRollup`. Every link in the review uses that commit sha, so it survives force-pushes.
2. **Read end to end.** The changed files in full, then their callers and the code they depend on, until each claim you make has a file:line you read. Check out the head in a worktree and run the changed project's own tests. Done when every changed file and every caller of a changed signature is accounted for.
3. **Hunt failure scenarios.** For each finding: concrete inputs or state, then the wrong outcome. A finding without one is a question, and goes under questions.
4. **Write** `pr-<n>-review.md` in the session scratchpad directory (or a temp directory when the session has none), never in the repo:
   - Header: PR title linked, author, base, head @ sha, closes, CI, review depth (what you read, what you ran and its result).
   - Verdict: two short paragraphs, what is right and what blocks.
   - Blocking, then Worth fixing before merge, then Nits, then Questions; numbered, each with its failure scenario, the cheapest fix, and links `[file#Lx-Ly](https://github.com/<repo>/blob/<sha>/<path>#Lx-Ly)`.
   - Prose: short and plain. No tables. No em dashes, en dashes, or double hyphens; use commas, parentheses, or periods.

Report the file path and the verdict in two lines.
