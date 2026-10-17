---
name: comment-cleanup
description: Tail step of a /code-review pass only. Tightens comments in the reviewed diff against the project's comment policy. Never invoke it after an ordinary change, on its own, or unless /code-review just ran or the user typed /comment-cleanup.
argument-hint: "[<spec-file> | last commit | last N commits | <commit-hash> | since <commit-hash>] (default: uncommitted changes)"
context: fork
disable-model-invocation: false
---

# Comment cleanup

Review the comments in a diff and tighten them to fit the project's comment policy. Runs
**after** implementation and review, when the whole picture is known. This is not guidance to the
implementor; it is a post-review pass.

You edit comments in place, then report what changed. Only comments change; never code, identifiers, strings, or behaviour.

## Step 1: Resolve the target diff and context

The optional ARGUMENT selects what to review. Classify it:

| Argument                                     | Diff to review                                                  | Context to read |
|----------------------------------------------|-----------------------------------------------------------------|---|
| _absent_                                     | uncommitted changes: `git diff HEAD` (plus new untracked files) | spec discovery, see below |
| a path that exists on disk                   | uncommitted changes (as above)                                  | that spec/task file |
| `last commit`                                | `git diff HEAD~1 HEAD`                                          | `git log -1` message |
| `last N commits` (e.g. `last three commits`) | resolve to `HEAD~N`, then `git diff HEAD~N HEAD`                | `git log HEAD~N..HEAD` messages |
| `since <hash>` or a bare `<hash>`            | inclusive of the hash: `git diff <hash>^ HEAD`                  | `git log <hash>^..HEAD` messages |

Classification order: exact `last commit` → `last N commits` phrasing (map the number word/digit
to `N`) → path that exists on disk → starts with `since ` → resolvable by `git rev-parse`
(commit-ish). A "last N commits" or `since`/hash form uses the commit-range logic.

**Spec discovery** (only when no path argument provided), try to find the latest `wish.md`/`task.md` for the current branch.
The spec directory is `$COMMENT_CLEANUP_SPEC_DIR` when set, else `_scratch`. Skip discovery when it does not exist.
`rg -l "Branch:.* $(git rev-parse --abbrev-ref HEAD)" "${COMMENT_CLEANUP_SPEC_DIR:-_scratch}" -g "wish.md" -g "task.md" --sortr=modified | head -1`
(`rg` may not be installed, so guard with `command -v rg >/dev/null 2>&1`; otherwise use
`find "${COMMENT_CLEANUP_SPEC_DIR:-_scratch}" -name 'wish.md' -o -name 'task.md' | xargs grep -l "Branch:.* $(git rev-parse --abbrev-ref HEAD)" | xargs ls -t | head -1`)
If found, read that file, and `specs.md` in that same directory, if it exists. Ignore them if they do not appear to match the diff. 

When reviewing committed changes, and no relevant spec was found, read commit messages for
additional context about the intent. 

Completion criterion: you have the diff text (list of changed files and hunks) and any available
context in hand.

## Step 2: Load the comment policy

Look for `COMMENTS.md` at the **git repo root**. If present, it is the authoritative policy: follow
it exactly. If absent, use the default policy below.

### Default policy (used only when no `COMMENTS.md`)

- Prefer no comment when the code is self-explanatory. Only genuinely complex code deserves a 
  higher-level explanation.
- When a comment is warranted, write up to four short lines that explains *why*, or a non-obvious
  constraint (ordering, transaction boundaries, invariants), not *what* the code does.
- Do not restate the signature or narrate control flow.
- Avoid heavy cross-reference chains in prose (`[SomeType]`, `Class#method`). Link only when
  the link is the point.
- Drop `@param` / `@return` that add nothing over the parameter name and type. Keep them if their
  description genuinely carry additional meaning, trim them if viable.
- Keep it to the essential; delete redundancy. Do not restate the same thing in multiple locations.
  Choose the most suitable one, and refer to it from other locations if needed.
- Avoid references to git-excluded artifacts (like those in the spec directory), including named
  points/decisions.
- KDoc/JavaDoc comments on broadly usable public API should be considered as documentation from the
  perspective of the caller. Be more lenient on pruning them, but only if they have multiple callers,
  or are general enough to be usable outside this particular feature.

## Step 3: Tighten the comments

Go through every comment inside the reviewed diff's **changed files / changed regions**, not the
whole repository.

For each comment, apply the policy: remove it, shorten it, or leave it. Match the comment density
and idiom of the surrounding code. When in doubt about a comment that carries a genuine *why*, keep
it.

Rules:
- Only edit comments (line comments, block comments, docstrings/KDoc). Never change code,
  identifiers, string literals, or behaviour.
- Code changes in the diff are not your concern, only the comments.
- Use the context from Step 1 to judge the *why*.

Completion criterion: every comment in the changed regions has been judged against the policy and
either kept, shortened, or removed.

## Step 4: Report

Print a concise per-file summary of what you changed (removed / shortened, with a one-line reason).
Do not commit. Tell the user to review and commit when satisfied.