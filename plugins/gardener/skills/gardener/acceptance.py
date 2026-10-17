#!/usr/bin/env python3
"""First-pass acceptance: share of sessions where the agent changed files and the user
asked for no modification afterwards. Usage: acceptance.py [days=7]
Reads transcripts from $CLAUDE_CONFIG_DIR/projects (default ~/.claude/projects)."""
import json, os, re, sys, time
from pathlib import Path

days = int(sys.argv[1]) if len(sys.argv) > 1 else 7
since = time.time() - days * 86400
CORRECTION = re.compile(
    r"^(no\b|nope|wrong|wait\b|stop\b)|\b(not what i|that's not|you didn'?t|why did you|i said|i told you|"
    r"revert|undo|don'?t do|again\b|still (broken|wrong|failing)|should(n'?t)? have|instead of)\b",
    re.I,
)
EDIT_TOOLS = {"Edit", "Write", "NotebookEdit", "MultiEdit"}


def text_of(content):
    if isinstance(content, str):
        return content
    return " ".join(c.get("text", "") for c in content if isinstance(c, dict) and c.get("type") == "text")


changed = accepted = 0
config = Path(os.environ.get("CLAUDE_CONFIG_DIR") or Path.home() / ".claude").expanduser()
for f in config.glob("projects/*/*.jsonl"):
    if f.stat().st_mtime < since:
        continue
    edited = corrected = False
    for line in f.open(errors="ignore"):
        try:
            e = json.loads(line)
        except ValueError:
            continue
        if not isinstance(e, dict):
            continue
        msg = e.get("message") or {}
        if not isinstance(msg, dict) or e.get("isSidechain") or e.get("isMeta"):
            continue
        if e.get("type") == "assistant":
            for c in msg.get("content") or []:
                if isinstance(c, dict) and c.get("type") == "tool_use" and c.get("name") in EDIT_TOOLS:
                    edited = True
        elif e.get("type") == "user" and edited:
            t = text_of(msg.get("content") or "").strip()
            if t and not t.startswith("<") and CORRECTION.search(t[:300]):
                corrected = True
    if edited:
        changed += 1
        accepted += not corrected

pct = 100 * accepted / changed if changed else 0
print(f"last {days}d: {accepted}/{changed} sessions with changes accepted without a correction ({pct:.0f}%)")
