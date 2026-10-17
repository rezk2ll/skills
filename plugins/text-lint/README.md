## What it does

Refuses PR, issue and commit text that breaks a fixed set of writing rules. It runs on `gh pr|issue create|edit`, `glab mr|issue create|update` and `git commit`, reads the title and body from the command, a heredoc or a `--body-file`, and lists every rule the text breaks.

## When to use it

- You want PR and commit text short and plain, without the usual generated boilerplate.
- You review a lot of Claude written PRs and keep fixing the same things by hand.

## How it works

The rules are the author's style. Each has an ID you can turn off:

- `DASH`: no em dash, en dash or spaced double hyphen in prose.
- `TEST_PLAN`: no "Test plan" section. CI is the test plan.
- `WORTH_KNOWING`: no "Worth knowing" section.
- `CONTEXT_SOLUTION`: no Context, Problem or Solution headings on a PR that is not a fix or an ADR.
- `FIX_FRAMING`: a feature is not a fix. Phrases like "until now", "previously", "was missing" or "there was no way to" are refused unless the title or branch starts with `fix` or `hotfix`. Not checked on issues.
- `TABLE`: no Markdown tables in PRs or issues.
- `HARD_WRAP`: one paragraph per line in PRs and issues.
- `REVIEW_TITLE`: a title says what changed, not "address review comments".

Code spans and fenced code blocks are skipped.

## Configuration

- `TEXT_LINT_DISABLE`: comma separated rule IDs to turn off, for example `DASH,HARD_WRAP`.
- `TEXT_LINT_PHRASES`: path to a file with one regex per line. It replaces the `FIX_FRAMING` phrase list. Lines starting with `#` are comments. Matching is case insensitive, on word boundaries.

## Overrides

- `# text-lint-override: <reason>`: append it to the command to post the text anyway.

## Requirements

- `python3`. `git` is used to read the current branch name.
