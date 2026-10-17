#!/usr/bin/env bash
# PostToolUse(Skill) and UserPromptSubmit: note which review-chain skills ran in this
# session, for chain-before-pr.sh (and pre-ship-gate, if installed) to check.
chain=${REVIEW_CHAIN_REQUIRED:-code-review ponytail-review comment-cleanup}
docs=${REVIEW_CHAIN_DOCS:-humanizer}
dir=${REVIEW_CHAIN_DIR:-${TMPDIR:-/tmp}/claude-review-chain}

input=$(cat)
session=$(jq -r '.session_id // empty' <<<"$input")
[ -n "$session" ] || exit 0
# Subagents share the parent's session_id; agent_id keeps each one's chain its own.
agent=$(jq -r '.agent_id // empty' <<<"$input")
name=$(jq -r '.tool_input.skill // (.prompt // "" | capture("^\\s*/(?<c>[^\\s]+)").c) // empty' <<<"$input")
name=${name##*:}
[ -n "$name" ] || exit 0
case " $chain $docs " in
  *" $name "*) ;;
  *) exit 0 ;;
esac
mkdir -p "$dir"
echo "$name $(date +%s)" >>"$dir/$session${agent:+-$agent}"
exit 0
