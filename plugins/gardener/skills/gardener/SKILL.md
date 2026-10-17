---
name: gardener
description: Weekly upkeep of your Claude Code setup (hooks, skills, settings, optional mistakes log), plus an acceptance metric from your session transcripts.
disable-model-invocation: true
---

# Gardener

Keep the Claude Code setup healthy: measure how often sessions land without a correction, turn repeated mistakes into checks, and flag drift in the repos you worked in.

## Setup

- Config dir: `$CLAUDE_CONFIG_DIR`, default `~/.claude`. Below, `<config>` means this dir. Transcripts live in `<config>/projects/*/*.jsonl`.
- Mistakes log: `$GARDENER_MISTAKES_LOG`, default `<config>/mistakes.md`. Optional. If the file does not exist, skip step 2.
- Lookback for repo scans: `$GARDENER_REPO_DAYS`, default 14.

Resolve the three values with one `echo` before starting and state them in the report.

Everything this skill changes lives in `<config>`. Repos are read only: what a repo should change goes into the report as a proposal.

## Steps

1. **Metric.** Run `python3 "${CLAUDE_SKILL_DIR}/acceptance.py" 7` and the same with `30` (the script sits next to this file). It counts sessions where the agent edited files and the user did not follow up with a correction. Done when both lines are in the report.
2. **Mistakes log** (only if it exists). Read it whole. The expected shape is one entry per mistake with `Count`, `Last seen`, `Enforcement` (`none`, `CLAUDE.md`, or the name of the check) and `Status` (`open`, `enforced`). If the log uses other field names, map them and say so. For each entry:
   - Count >= 2 and Enforcement is `CLAUDE.md` or `none`: a written rule is not holding. Draft the check that would catch it (a hook in `<config>/settings.json`, a pattern in an existing hook script, or a step in a skill), test it on a synthetic case, and show the diff. Apply it only after the user's go, then set Enforcement and Status.
   - Status `enforced` but Last seen is after the date it became enforced: the check leaks. Find the transcript (`grep -l` in `<config>/projects/*/*.jsonl` around Last seen) and say why the check missed.
   - Enforced and Last seen more than 30 days ago: collapse it to one line under `## Enforced`.

   Done when every entry has been through these three tests.
3. **Setup health.** Check that what `<config>` references still exists and runs:
   - Every hook command in `<config>/settings.json` points to a file that exists and is executable. Shell scripts pass `bash -n`, Python passes `python3 -m py_compile`.
   - Every skill in `<config>/skills/*/SKILL.md` has `name` and `description` frontmatter, and any file it references by path exists.
   - Rules in `<config>/CLAUDE.md` that contradict each other, or that a hook now enforces (the rule can shrink to one line).

   Report each problem with file:line and the fix. Apply fixes only after the user's go.
4. **Read the repos.** For each repo the user worked in during the last 7 days (`ls -t <config>/projects`, each dir name is the repo path with `/` replaced by `-`), scan the last `$GARDENER_REPO_DAYS` days of merged commits on the default branch for: the same helper written twice, a compatibility shim or flag whose reason is gone, a pattern that spread from one file to several. Report each with commit sha and file:line and the lint rule or deletion that would retire it.
5. **Report** in the chat, short: metric, promotions applied or proposed, leaking checks, collapsed entries, setup problems, repo proposals.
