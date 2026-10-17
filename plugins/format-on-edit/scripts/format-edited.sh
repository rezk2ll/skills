#!/usr/bin/env bash
# PostToolUse(Write|Edit): format+lint the edited file using whatever the project already has.
# Lint errors left after --fix exit 2, which feeds them back to the agent.
f=$(jq -r '.tool_response.filePath // .tool_input.file_path // empty')
[ -n "$f" ] && [ -f "$f" ] || exit 0
root=$(git -C "$(dirname "$f")" rev-parse --show-toplevel 2>/dev/null) || exit 0

# Monorepos keep tools per sub-project, so walk up from the file to the nearest one.
bin_for() {
  local d; d=$(dirname "$f")
  while [ "${d#"$root"}" != "$d" ]; do
    [ -x "$d/node_modules/.bin/$1" ] && { printf '%s\n' "$d"; return 0; }
    d=$(dirname "$d")
  done
  return 1
}

case "$f" in
  *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs|*.svelte|*.vue|*.json|*.css|*.scss|*.md|*.yml|*.yaml)
    if p=$(bin_for prettier); then (cd "$p" && node_modules/.bin/prettier --write --ignore-unknown "$f" >/dev/null 2>&1); fi
    ;;
esac

out=""
case "$f" in
  *.ts|*.tsx|*.js|*.jsx|*.svelte|*.vue)
    if p=$(bin_for eslint); then
      out=$(cd "$p" && node_modules/.bin/eslint --fix --format json "$f" 2>/dev/null |
        jq -r '.[] | .filePath as $p | .messages[] | select(.severity == 2) | "\($p):\(.line):\(.column): \(.message) [\(.ruleId)]"' 2>/dev/null)
    fi
    ;;
  *.py)
    command -v ruff >/dev/null && { ruff format "$f" >/dev/null 2>&1; out=$(ruff check --fix --output-format concise "$f" 2>&1); }
    ;;
  *.go)  command -v gofmt >/dev/null && gofmt -w "$f" >/dev/null 2>&1 ;;
  *.rs)  command -v rustfmt >/dev/null && rustfmt "$f" >/dev/null 2>&1 ;;
  *.php) (cd "$root" && [ -x vendor/bin/php-cs-fixer ] && vendor/bin/php-cs-fixer fix "$f" >/dev/null 2>&1) ;;
esac

errors=$(printf '%s\n' "$out" | grep -E ':[0-9]+:[0-9]+:? ' | head -40)
[ -n "$errors" ] || exit 0
printf 'Lint errors in %s after autofix:\n%s\n' "$f" "$errors" >&2
exit 2
