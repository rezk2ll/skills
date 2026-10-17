#!/usr/bin/env python3
"""PreToolUse(Bash|Read|GitHub MCP): refuse actions that need the user's go.

This covers merges and closes, GitLab notes, reading secret files, printing
Kubernetes secrets, shell rewrites of tracked files, commits behind a piped check,
and tearing down containers the user may still be testing. Each rule names its own override token, so a bypass stays
visible in the transcript.
"""
import json
import os
import re
import sys

try:
    data = json.load(sys.stdin)
except Exception:
    sys.exit(0)
tool = data.get("tool_name", "")
inp = data.get("tool_input", {}) or {}

SECRET_FILE = r"(?:^|[\s/'\"=])(\.env(?:\.(?!example\b|sample\b|template\b|dist\b)[\w.-]+)?|[\w.-]*secrets?[\w.-]*\.ya?ml|[\w.-]+\.pem|id_(?:rsa|ed25519))(?=$|[\s'\";|&)])"
PRINTERS = r"\b(cat|bat|less|more|head|tail|grep|rg|awk|sed(?!\s+-i)|jq|yq|strings|xxd|od|base64)\b"

RULES = [
    (
        "merge-go",
        lambda c: re.search(r"\bgh\s+pr\s+(merge|close)\b|\bglab\s+mr\s+(merge|close)\b|\bgh\s+issue\s+close\b|\bglab\s+issue\s+close\b", c),
        "merges and closes need the user's explicit go in this conversation. Tell them it is ready and stop.",
    ),
    (
        "gh-go",
        lambda c: re.search(r"\bglab\s+(mr|issue)\s+note\b|\bglab\s+api\b(?=.*\bnotes\b)(?=.*(-X\s*(POST|PUT|DELETE)|--method\s+(POST|PUT|DELETE)))", c),
        "this posts on GitLab as the user. Show the exact text in chat and wait for their go.",
    ),
    (
        "teardown-go",
        lambda c: re.search(r"\bdocker(?:-compose|\s+compose)?\b[^|;&]*\s(down|stop|kill|rm|prune)\b|\bdocker\s+(volume|container|system|network)\s+(rm|prune)\b", c),
        "the user may still be testing against these containers. Ask before stopping or removing them. If you started this container yourself in this session, say so and append the override.",
    ),
    (
        "secret-go",
        lambda c: any(
            re.search(PRINTERS, seg) and re.search(SECRET_FILE, re.sub(r">>?\s*\S+", "", seg))
            for seg in re.split(r"[;&\n]+|\|(?!\|)", c)
        ),
        "this would print a secret file into the transcript. Use the file without reading it (source it, pass it with --env-file), or list its keys with `cut -d= -f1 <file>`.",
    ),
]

if tool == "Read":
    path = inp.get("file_path", "")
    if re.search(SECRET_FILE, "/" + os.path.basename(path)):
        print(json.dumps({"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny",
              "permissionDecisionReason": f"guard: {path} holds secrets. Do not read it. List its keys with `cut -d= -f1 {path}`, or ask the user for the one value you need."}}))
    sys.exit(0)

if tool.startswith("mcp__") and re.search(r"github.*__(merge_pull_request|update_pull_request|issue_write)$", tool):
    state = json.dumps(inp)
    if tool.endswith("merge_pull_request") or re.search(r'"state":\s*"closed"', state):
        print(json.dumps({"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "ask",
              "permissionDecisionReason": "guard: merging or closing on GitHub needs the user's go."}}))
    sys.exit(0)

if tool != "Bash":
    sys.exit(0)
cmd = inp.get("command", "")
cwd = data.get("cwd") or "."
RULES += [
    (
        "shell-edit",
        lambda c: any(tracked(p) for p in shell_edit_targets(c)),
        "this rewrites a git-tracked file through the shell, so the user sees no diff. Read it, then use Edit (or Write for a whole new file).",
    ),
    (
        "pipe-commit",
        lambda c: re.search(r"\bgit\s+(commit|push)\b", c) and "pipefail" not in c
        and re.search(r"\b(test|check|lint|typecheck|vitest|jest|tsc|pytest|rspec|mvn|gradle|cargo|build)\b(?:[^;&|\n]|&(?!&))*\|\s*(grep|tail|head)\b[^;\n]*?(&&|;)[^\n]*\bgit\s+(commit|push)\b", c, re.S),
        "the check is piped through grep/tail/head, so its exit code is lost and the commit runs even when it fails. Run the check alone, read the result, then commit.",
    ),
    (
        "secret-go",
        lambda c: re.search(r"\bkubectl\b[^|;&\n]*\bget\s+secrets?\b[^|;&\n]*-o\s*=?\s*(ya?ml|json|jsonpath|go-template)", c)
        and not re.search(r"\|\s*jq\b.*\bkeys\b", c)
        or re.search(r"\bkubectl\b[^|;&\n]*\bexec\b.*\s--\s+(env|printenv)\b", c),
        "this prints Secret values into the transcript. List the keys only (`kubectl get secret X -o json | jq '.data|keys'`) or ask the user for the one value.",
    ),
]


def tracked(path):
    path = os.path.expanduser(path.strip("'\""))
    if not path or path.startswith(("/tmp/", "/dev/", "-")):
        return False
    import subprocess
    try:
        return subprocess.run(["git", "-C", cwd, "ls-files", "--error-unmatch", "--", path],
                              capture_output=True, timeout=5).returncode == 0
    except Exception:
        return False


def shell_edit_targets(c):
    out = []
    for seg in re.split(r"[;&\n]+|\|(?!\|)", c):
        words = seg.split()
        if re.search(r"\bsed\s+(\S+\s+)*?(-[a-zA-Z]*i\b|--in-place)|\bperl\s+-[a-zA-Z]*i", seg):
            out += words[2:]
        m = re.match(r"\s*cp\s+(.+)\s+(\S+)\s*$", seg)
        if m:
            out.append(m.group(2))
        out += re.findall(r"(?<![<>&\d])>>?\s*([^\s;&|>()]+)", seg)
        m = re.match(r"\s*tee\s+(?:-a\s+)?(\S+)", seg)
        if m:
            out.append(m.group(1))
    # A script's writes live inside its heredoc or -c string, so read the raw command.
    if re.search(r"\b(python3?|node|ruby)\b", cmd) and re.search(r"write_text\(|writeFileSync|open\([^)]*['\"][wa]\+?['\"]", cmd):
        out += re.findall(r"['\"]([\w./~-]+\.\w+)['\"]", cmd)
    return out
# Text inside a heredoc or a quoted --body is prose, not a command.
scan = re.sub(r"<<-?\s*'?\"?(\w+)'?\"?\n.*?\n\s*\1\b", "", cmd, flags=re.S)
scan = re.sub(r"(--body|--description|-m|--message)[ =](\"(?:[^\"\\]|\\.)*\"|'[^']*')", "", scan)

for token, match, why in RULES:
    if f"# {token}" in cmd:
        continue
    if match(scan):
        print(json.dumps({"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny",
              "permissionDecisionReason": f"guard: {why}\nOnly with the user's explicit go, rerun with `# {token}` appended."}}))
        sys.exit(0)
