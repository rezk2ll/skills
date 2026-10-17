#!/usr/bin/env bash
# PreToolUse(Skill): refuse the PR skill until the review chain ran in this session, so
# the question comes before the PR body is drafted, not at `gh pr create`.
gated=${REVIEW_CHAIN_GATED_SKILL:-pr}
chain=${REVIEW_CHAIN_REQUIRED:-code-review ponytail-review comment-cleanup}
dir=${REVIEW_CHAIN_DIR:-${TMPDIR:-/tmp}/claude-review-chain}

input=$(cat)
skill=$(jq -r '.tool_input.skill // empty' <<<"$input")
[ "${skill##*:}" = "$gated" ] || exit 0
key=$(jq -r '.session_id + (if .agent_id then "-" + .agent_id else "" end)' <<<"$input")
ran=$(cut -d' ' -f1 "$dir/$key" 2>/dev/null | sort -u)
missing=""
for s in $chain; do
  grep -qx "$s" <<<"$ran" || missing="$missing $s"
done
[ -z "$missing" ] && exit 0
jq -nc --arg r "Review chain not run in this session:$missing. Run $chain on the diff (in that order), test locally, then /$gated." \
  '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$r}}'
