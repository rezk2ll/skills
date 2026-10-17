## What it does

Puts the context size and the session cost in the status line after every turn, as `ctx 84K · $1.20`. When the context passes 200K tokens it toasts once, suggesting `/compact` or `/clear`.

## When to use it

- You want one small line that tells you how full the context is and what the session has cost.
- You want a nudge before a long session gets slow and expensive.

## How it works

- Reads `$.session.usage()` after each main turn. Subagent turns are skipped.
- The cost part only shows when Claude Code reports a cost for your account.
- The warning fires once per crossing. Dropping back under the threshold, after a `/compact` for example, re-arms it.

## Configuration

Set this with `/config`, or under `pluginConfigs` in your user settings.

- `warnAt` (default `200000`): the token count that triggers the warning.

## Requirements

- Claude Code 2.1.287 or later.
