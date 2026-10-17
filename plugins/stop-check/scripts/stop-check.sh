#!/usr/bin/env bash
# Stop: refuse to finish while a JS/TS project touched on this branch fails its typecheck
# or the tests related to the changed files. A passing state is cached by content hash,
# so turns that change nothing cost nothing.
set -uo pipefail

state=${STOP_CHECK_DIR:-${TMPDIR:-/tmp}/claude-stop-check}
max=${STOP_CHECK_MAX_ATTEMPTS:-3}
mkdir -p "$state"

input=$(cat)
session=$(jq -r '.session_id // "x"' <<<"$input")
cwd=$(jq -r '.cwd // empty' <<<"$input")
root=$(git -C "${cwd:-.}" rev-parse --show-toplevel 2>/dev/null) || exit 0
cd "$root" || exit 0

def=$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null || echo origin/main)
base=$(git merge-base HEAD "$def" 2>/dev/null) || base=HEAD
changed=$( { git diff --name-only "$base"; git ls-files --others --exclude-standard; } | sort -u |
  grep -E '\.(ts|tsx|svelte|vue|js|jsx|mjs|cjs)$' | grep -vE '(^|/)(node_modules|dist|build|\.svelte-kit)/')
[ -n "$changed" ] || exit 0

# Monorepos keep a package.json per sub-project; the nearest one owns the file.
project_of() {
  local d; d=$(dirname "$1")
  while :; do
    [ -f "$d/package.json" ] && { echo "$d"; return; }
    [ "$d" = "." ] && return
    d=$(dirname "$d")
  done
}

# A project's own typecheck script wins; lint is the fallback because some tsconfigs
# do not typecheck cleanly on their default branch.
typecheck_cmd() {
  local s
  for s in typecheck check lint; do
    jq -e --arg s "$s" '.scripts[$s]' "$1/package.json" >/dev/null 2>&1 && { echo "npm run -s $s"; return; }
  done
}

# The command is eval'd, so quote each path: SvelteKit route groups like (main) are shell syntax.
related_cmd() {
  local q; q=$(printf '%q ' $2)
  if [ -x "$1/node_modules/.bin/vitest" ]; then echo "npx vitest related --run --passWithNoTests $q"
  elif [ -x "$1/node_modules/.bin/jest" ]; then echo "npx jest --findRelatedTests --passWithNoTests $q"
  fi
}

failures=""
skipped=""
for proj in $(while read -r f; do project_of "$f"; done <<<"$changed" | sort -u); do
  if [ ! -d "$proj/node_modules" ]; then
    skipped="$skipped $proj"
    continue
  fi
  files=$(grep "^${proj#./}/" <<<"$changed" | while read -r f; do [ -f "$f" ] && [ "$(project_of "$f")" = "$proj" ] && printf '%s ' "$root/$f"; done)
  [ "$proj" = "." ] && files=$(while read -r f; do [ -f "$f" ] && [ "$(project_of "$f")" = "." ] && printf '%s ' "$root/$f"; done <<<"$changed")
  hash=$( { git diff "$base" -- "$proj"; for f in $files; do cat "$f"; done; } | sha1sum | cut -c1-16)
  stamp="$state/pass-$(echo "$root/$proj" | sha1sum | cut -c1-8)-$hash"
  [ -f "$stamp" ] && continue

  tc=$(typecheck_cmd "$proj")
  if [ -n "$tc" ]; then
    out=$(cd "$proj" && eval "$tc" 2>&1) || { failures+=$'\n'"## $proj: $tc"$'\n'"$(tail -25 <<<"$out")"; continue; }
  fi
  rel=$(related_cmd "$proj" "$files")
  if [ -n "$rel" ] && [ -n "$files" ]; then
    out=$(cd "$proj" && eval "$rel" 2>&1) || { failures+=$'\n'"## $proj: related tests"$'\n'"$(tail -40 <<<"$out")"; continue; }
  fi
  touch "$stamp"
done

if [ -z "$failures" ]; then
  [ -n "$skipped" ] && jq -nc --arg m "stop-check: not verified, no node_modules in:$skipped. Run npm ci there before claiming the change works." '{systemMessage:$m}'
  exit 0
fi

# Never trap a session that cannot fix the failure: give up blocking after $max tries.
count_file="$state/count-$session"
count=$(( $(cat "$count_file" 2>/dev/null || echo 0) + 1 ))
echo "$count" >"$count_file"
if [ "$count" -gt "$max" ]; then
  rm -f "$count_file"
  jq -nc --arg m "stop-check still failing after $max attempts. Tell the user the checks fail and show the output.$failures" '{systemMessage:$m}'
  exit 0
fi

jq -nc --arg r "Checks fail on the projects you changed. Fix them before finishing; do not report the task as done.$failures" '{decision:"block",reason:$r}'
