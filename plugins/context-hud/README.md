## What it does

Shows your context window and plan usage limits without asking for them. In the terminal, the footer row gets small gauges for the context and for the 5-hour and weekly limits, with a pace marker. `/context-hud` opens a pane that breaks the context down by category and estimates how many turns are left before compaction. A toast fires once when the context passes 200K tokens.

## When to use it

- You run long sessions and want to see the context fill up before auto-compaction surprises you.
- You are on a plan with usage limits and want to know if you are on pace to hit one before it resets.
- You want to know whether the prompt cache is still warm before you send the next message.

## How it works

- Footer (terminal): a `ctx` gauge with percent and token count, one gauge per usage limit with its reset countdown, and a tick showing how much of the window has elapsed. A limit on pace to run out reads red.
- Above the footer: a cache timer (`cache warm 42m`, or `cache cold` once an hour has passed since the last turn).
- Desktop app: the limits draw as a small card in the band above the prompt.
- `/context-hud` toggles the pane: each category's share of the window, growth last turn and averaged over recent turns, and turns left at that rate. `/context-hud refresh` counts exactly with the token-count API instead of the local estimate.
- After `/compact` or `/clear`, the old figures are dropped until the next answer.
- If the review-chain plugin from this repo is installed, the footer also shows which of the code-review, ponytail-review and comment-cleanup passes ran in this session. Without it, that row stays hidden.

## Configuration

Set this with `/config`, or under `pluginConfigs` in your user settings.

- `warnAt` (default `200000`): the token count that triggers the warning toast.

The review-chain row reads `REVIEW_CHAIN_DIR`, or `$TMPDIR/claude-review-chain` when it is unset, the same place the review-chain plugin writes.

## Requirements

- Claude Code 2.1.287 or later.
- Optional: the review-chain plugin from this repo, for the review progress row.
