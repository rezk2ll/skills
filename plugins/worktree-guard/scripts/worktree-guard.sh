#!/usr/bin/env bash
# PreToolUse(Edit|Write|NotebookEdit|Bash): while another Claude session works in the main
# checkout, edits there land in its diff. Refuse them and send this session to a worktree.
set -uo pipefail

wt=${WORKTREE_GUARD_DIR:-.claude/worktrees}
sessions=${WORKTREE_GUARD_SESSIONS:-${CLAUDE_CONFIG_DIR:-$HOME/.claude}/sessions}

input=$(cat)
f=$(jq -r '.tool_input.file_path // .tool_input.notebook_path // empty' <<<"$input")
# A branch switch or git rm in the shared checkout lands before any Edit would trip.
dir=$(dirname "$f")
if [ -z "$f" ] && grep -qE '(^|[;&|(])\s*git\s+(checkout|switch|pull|rm|mv|stash|reset|rebase|merge)\b' <<<"$(jq -r '.tool_input.command // empty' <<<"$input")"; then
  dir=$(jq -r '.cwd // empty' <<<"$input")
  f="$dir/x/x"
fi
me=$(jq -r '.session_id // empty' <<<"$input")
[ -n "$f" ] || exit 0

common=$(git -C "$dir" rev-parse --path-format=absolute --git-common-dir 2>/dev/null) || exit 0
main=$(dirname "$common")
case "$f" in
  "$main/$wt"/*) exit 0 ;;
  "$main"/*/*) ;;   # inside a sub-project or tracked directory
  *) exit 0 ;;      # scratch files at the repo root
esac

for s in "$sessions"/*.json; do
  [ -f "$s" ] || continue
  read -r pid sid cwd name < <(jq -r '[.pid, .sessionId, .cwd, (.name // "")] | @tsv' "$s" 2>/dev/null) || continue
  [ "$sid" = "$me" ] && continue
  kill -0 "$pid" 2>/dev/null || continue
  case "$cwd" in
    "$main/$wt"/*) continue ;;
    "$main" | "$main"/*) ;;
    *) continue ;;
  esac
  reason="Another Claude session (${name:-pid $pid}) is working in the main checkout $main, so this edit would land in its diff. Work in a worktree: git worktree add $wt/<branch> -b <branch> origin/main, then edit the files there."
  jq -nc --arg r "$reason" '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$r}}'
  exit 0
done
exit 0
