## What it does

Blocks the `pr` skill until three review skills have run in the current session: `code-review`, `ponytail-review` and `comment-cleanup`. The refusal comes before Claude drafts a PR body, not at `gh pr create`.

## When to use it

- You want every PR Claude opens to go through the same review steps.
- You keep forgetting to run the review before asking for a PR.
- You run subagents that open PRs and want each one to review its own diff.

## How it works

- A `PostToolUse` hook on `Skill` and a `UserPromptSubmit` hook record each review skill as it runs, whether Claude calls it or you type `/code-review`.
- A `PreToolUse` hook on `Skill` denies the gated skill while any step of the chain is missing, and names the missing steps.
- State is per session. A subagent keeps its own chain, so a review in the parent does not count for the subagent.
- Plugin prefixes are ignored: `code-review:code-review` counts as `code-review`.

## Configuration

- `REVIEW_CHAIN_GATED_SKILL`: the skill to block. Default `pr`.
- `REVIEW_CHAIN_REQUIRED`: space separated skills that must run first, in the order you want them run. Default `code-review ponytail-review comment-cleanup`.
- `REVIEW_CHAIN_DOCS`: skills recorded for docs only PRs. Default `humanizer`. Only the `pre-ship-gate` plugin reads this.
- `REVIEW_CHAIN_DIR`: where the per session record lives. Default `${TMPDIR:-/tmp}/claude-review-chain`.

There is no override token. To skip the chain, run the skills or change `REVIEW_CHAIN_REQUIRED`.

## Requirements

- `jq`.
- The skills in the default chain, each from a public plugin:
  - `code-review` from `code-review@claude-plugins-official`
  - `ponytail-review` from the ponytail plugin (`DietrichGebert/ponytail`)
  - `comment-cleanup` and `pr` from this repo
- With a different chain, install whatever provides the skills you name instead.
