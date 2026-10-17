## What it does

`/gardener` is a weekly checkup for your Claude Code setup. It measures how often sessions with edits end without you correcting the agent, turns mistakes that keep coming back into hooks or skill steps, finds broken hooks and skills, and flags drift in the repos you worked in. It proposes changes and applies them only after your go.

## When to use it

- Once a week, by typing `/gardener`. It does not run on its own.
- When you keep a mistakes log and want repeated entries to become real checks.
- After editing hooks or skills, to catch dangling paths and syntax errors.

## How it works

- `acceptance.py` reads your session transcripts and prints the share of sessions with edits that had no correction afterwards, for 7 and 30 days.
- If you keep a mistakes log, entries seen twice or more that rely on a written rule get a drafted check. Enforced entries that show up again are traced to the transcript that slipped through.
- Hook commands in `settings.json` must exist, be executable and parse. Skills need `name` and `description` and their referenced files.
- Recent merged commits in your repos are scanned for duplicated helpers, stale shims and patterns spreading across files. These stay proposals; repos are read only.

## Configuration

- `CLAUDE_CONFIG_DIR`: your Claude Code config dir. Default `~/.claude`.
- `GARDENER_MISTAKES_LOG`: path to your mistakes log. Default `<config>/mistakes.md`. Optional; the step is skipped when the file is missing.
- `GARDENER_REPO_DAYS`: how many days of merged commits to scan per repo. Default 14.

## Requirements

- `python3` and `git`.
