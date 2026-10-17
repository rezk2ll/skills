#!/usr/bin/env bash
# PreToolUse(Bash): refuse to ship a change a reviewer cannot follow.
# Runs on `git commit` and `gh pr create`. Override with `# ship-override: <reason>`
# appended to the command, which keeps the escape hatch visible in the transcript.
#
# Lockfiles count as mechanical for sizing but do NOT trip the mixing check:
# a dependency bump legitimately touches package.json and its lock together.
set -uo pipefail

MAX=${SHIP_MAX_SEMANTIC_LINES:-400}

input=$(cat)
cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // empty' 2>/dev/null) || exit 0
[ -n "$cmd" ] || exit 0

case "$cmd" in
  *ship-override:*) exit 0 ;;
  *"gh pr create"*) phase=pr ;;
  *"git commit"*)   phase=commit ;;
  *) exit 0 ;;
esac

root=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
cd "$root" || exit 0

if [ "$phase" = pr ]; then
  base=$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null) || base=""
  [ -n "$base" ] || for b in origin/main origin/master origin/develop; do
    git rev-parse --verify -q "$b" >/dev/null && { base=$b; break; }
  done
  [ -n "$base" ] || exit 0
  mb=$(git merge-base HEAD "$base" 2>/dev/null) || exit 0
  diff_args=("$mb" HEAD)
else
  diff_args=(--cached)
fi

is_lock()  { case "$1" in *package-lock.json|*pnpm-lock.yaml|*yarn.lock|*Cargo.lock|*go.sum) return 0;; esac; return 1; }
is_gen()   { case "$1" in */dist/*|*/build/*|*.gen.*|*_pb2.py|*.min.js|*.min.css|*/__generated__/*) return 0;; esac; return 1; }
is_doc()   { case "$1" in *.md|*.mdx|*.txt) return 0;; esac; return 1; }
is_test()  { case "$1" in *test*|*spec*|*/__tests__/*) return 0;; esac; return 1; }

# nearest ancestor holding a package manifest; "." when only the root has one
proj_of() {
  local d; d=$(dirname "$1")
  while [ "$d" != "." ] && [ "$d" != "/" ]; do
    for m in package.json go.mod Cargo.toml pyproject.toml; do
      [ -f "$d/$m" ] && { printf '%s\n' "$d"; return; }
    done
    d=$(dirname "$d")
  done
  printf '.\n'
}

semantic_lines() { # <numstat stream> -> lines of reviewable code
  local total=0 add del f
  while read -r add del f; do
    [ -n "${f:-}" ] || continue
    [ "$add" = "-" ] && continue                       # binary
    is_lock "$f" || is_gen "$f" || is_doc "$f" && continue
    total=$(( total + add + del ))
  done
  printf '%s' "$total"
}

renamed=$(git diff --name-status -M --diff-filter=R "${diff_args[@]}" | wc -l)
changed=$(git diff --name-only -M "${diff_args[@]}")
[ -n "$changed" ] || exit 0

sem_files=(); gen_files=(); lock_files=(); test_files=()
while IFS= read -r f; do
  [ -n "$f" ] || continue
  if   is_lock "$f"; then lock_files+=("$f")
  elif is_gen  "$f"; then gen_files+=("$f")
  elif is_test "$f"; then test_files+=("$f")
  elif is_doc  "$f"; then :
  else sem_files+=("$f")
  fi
done <<<"$changed"

total_sem=$(git diff --numstat -M "${diff_args[@]}" | semantic_lines)
fail=()

# 1. mechanical mixed with semantic
if [ "${#sem_files[@]}" -gt 0 ] && { [ "$renamed" -gt 0 ] || [ "${#gen_files[@]}" -gt 0 ]; }; then
  detail=""
  [ "$renamed" -gt 0 ] && detail="$renamed renamed/moved file(s)"
  [ "${#gen_files[@]}" -gt 0 ] && detail="${detail:+$detail and }${#gen_files[@]} generated file(s): ${gen_files[*]:0:3}"
  fail+=("MIXED: $detail ride along with ${#sem_files[@]} source file(s). Ship the mechanical change as its own commit or PR first, then the logic on top. A reviewer cannot tell a move from an edit when they arrive together.")
fi

# 2. new dependency
old_ref=$([ "$phase" = pr ] && printf '%s' "${diff_args[0]}" || printf 'HEAD')
while IFS= read -r pj; do
  [ -n "$pj" ] || continue
  before=$(git show "$old_ref:$pj" 2>/dev/null | jq -r '(.dependencies//{})+(.devDependencies//{})|keys[]?' 2>/dev/null | sort)
  after=$( { [ "$phase" = pr ] && git show "HEAD:$pj" || git show ":$pj"; } 2>/dev/null | jq -r '(.dependencies//{})+(.devDependencies//{})|keys[]?' 2>/dev/null | sort)
  added=$(comm -13 <(printf '%s\n' "$before") <(printf '%s\n' "$after") | tr '\n' ' ')
  [ -n "${added// /}" ] && fail+=("NEW DEPENDENCY in $pj: ${added}- justify it or use what the project already has.")
done <<<"$(printf '%s\n' "$changed" | grep -E '(^|/)package\.json$' || true)"

# 3+4 apply to the whole change, so only at PR time
if [ "$phase" = pr ]; then

  # 3. source changed without tests, skipped where the project defines no test script
  for p in $(for f in "${sem_files[@]:-}"; do [ -n "$f" ] && proj_of "$f"; done | sort -u); do
    [ -f "$p/package.json" ] || continue
    jq -e '.scripts.test' "$p/package.json" >/dev/null 2>&1 || continue
    touched=0
    for t in "${test_files[@]:-}"; do [ -n "$t" ] && [ "$(proj_of "$t")" = "$p" ] && touched=1; done
    [ "$touched" -eq 0 ] && fail+=("NO TESTS: $p changed but no test file did, and it defines a \`test\` script. Add or update a test, or say in the PR body why the change is untestable.")
  done

  # 4. size, measured per commit because sequenced commits are the agreed split
  if [ "$total_sem" -gt "$MAX" ]; then
    ncommits=$(git rev-list --count "${diff_args[0]}..HEAD")
    worst=0; worst_sha=""
    while read -r sha; do
      [ -n "$sha" ] || continue
      n=$(git diff --numstat -M "$sha^" "$sha" 2>/dev/null | semantic_lines)
      [ "$n" -gt "$worst" ] && { worst=$n; worst_sha=$sha; }
    done <<<"$(git rev-list "${diff_args[0]}..HEAD")"

    body=$(printf '%s' "$cmd" | grep -oP '(?<=--body[ =])\K.*' | head -1)
    case "$cmd" in *--body-file*)
      bf=$(printf '%s' "$cmd" | grep -oP '(?<=--body-file[ =])\K[^ ]+' | head -1)
      [ -n "${bf:-}" ] && [ -f "$bf" ] && body=$(cat "$bf") ;;
    esac
    has_order=0
    printf '%s' "$body" | grep -qiE 'read|review' && printf '%s' "$body" | grep -qiE 'commit|order' && has_order=1

    if [ "$worst" -gt "$MAX" ]; then
      fail+=("TOO BIG TO REVIEW: $total_sem semantic lines across $ncommits commit(s), and the largest single commit is $worst (${worst_sha:0:8}), over the $MAX limit. Split it into commits that each stand alone, then name the reading order in the PR body.")
    elif [ "$has_order" -eq 0 ]; then
      fail+=("READING ORDER MISSING: $total_sem semantic lines over $ncommits commits, each under $MAX, so the sequence is fine. The PR body must tell the reviewer to read it commit by commit and in what order.")
    fi
  fi

  # 5. review chain, recorded by the review-chain plugin for this session. "auto" only
  # enforces once that plugin has written its state dir, so the gate works without it.
  chain_dir=${REVIEW_CHAIN_DIR:-${TMPDIR:-/tmp}/claude-review-chain}
  mode=${SHIP_REVIEW_CHAIN:-auto}
  if [ "$mode" = 1 ] || { [ "$mode" = auto ] && [ -d "$chain_dir" ]; }; then
    key=$(printf '%s' "$input" | jq -r '.session_id + (if .agent_id then "-" + .agent_id else "" end)')
    ran=$(cut -d' ' -f1 "$chain_dir/$key" 2>/dev/null | sort -u)
    code_chain=${REVIEW_CHAIN_REQUIRED:-code-review ponytail-review comment-cleanup}
    docs_chain=${REVIEW_CHAIN_DOCS:-humanizer}
    if [ "${#sem_files[@]}" -gt 0 ]; then need=$code_chain; else need=$docs_chain; fi
    missing=$(for s in $need; do grep -qx "$s" <<<"$ran" || printf '%s ' "$s"; done)
    [ -n "$missing" ] && fail+=("REVIEW CHAIN NOT RUN in this session: ${missing}. Run them in order ($code_chain; $docs_chain for a docs-only PR) on this diff, then open the PR.")
  fi
fi

[ "${#fail[@]}" -eq 0 ] && exit 0

reason=$(printf 'Pre-ship gate refused this %s.\n\n' "$phase"
         for i in "${!fail[@]}"; do printf '%s. %s\n\n' "$((i+1))" "${fail[$i]}"; done
         printf 'Fix the cause. To ship anyway, append `# ship-override: <reason>` to the command.\n')

jq -nc --arg r "$reason" \
  '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$r}}'
exit 0
