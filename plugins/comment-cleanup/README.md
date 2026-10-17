## What it does

`comment-cleanup` goes through the comments in a diff and removes or shortens the ones that do not earn their place. It only touches comments, never code. It is meant as the last step of a code review, once the change is settled.

## When to use it

- Right after a `/code-review` pass, as its tail step.
- When you type `/comment-cleanup` on uncommitted changes, `last commit`, `last 3 commits`, `since <hash>`, or a spec file.

It is not for use after every ordinary change.

## How it works

- Resolves the diff from the argument, plus commit messages or a matching spec file for intent.
- Uses `COMMENTS.md` at the repo root as the policy when it exists.
- Otherwise applies a default policy: prefer no comment, keep a comment only for a why or a non-obvious constraint, never narrate control flow or restate a signature.
- Edits comments in place and prints a per-file summary. It does not commit.

## Configuration

- `COMMENT_CLEANUP_SPEC_DIR`: directory searched for a `wish.md` or `task.md` whose `Branch:` line matches the current branch. Default `_scratch`. Discovery is skipped when the directory does not exist.

## Requirements

- `git`. `rg` is used when present, with a `find` fallback.
- Optional: the `code-review` plugin from `claude-plugins-official` (`/plugin install code-review@claude-plugins-official`), which this skill is designed to follow.
