#!/usr/bin/env python3
"""PreToolUse(Bash): refuse PR, issue and commit text that breaks the writing rules.

Runs on gh/glab pr|mr|issue create|edit|update and git commit. Override with
`# text-lint-override: <reason>` appended to the command.
"""
import json
import os
import re
import subprocess
import sys

def refuse(msg):
    print(json.dumps({"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny", "permissionDecisionReason": "text-lint: " + msg}}))
    sys.exit(0)


try:
    cmd = json.load(sys.stdin).get("tool_input", {}).get("command", "")
except Exception:
    sys.exit(0)
if not cmd or "text-lint-override:" in cmd:
    sys.exit(0)

# Only at command position: a script or heredoc that merely mentions the command is not one.
AT = r"(?:^|[;&|(]\s*|\n\s*)"
if re.search(AT + r"(gh pr|glab mr) (create|edit|update)\b", cmd):
    kind = "pr"
elif re.search(AT + r"(gh|glab) issue (create|edit|update)\b", cmd):
    kind = "issue"
elif re.search(AT + r"git commit\b", cmd) and not re.search(r"--amend --no-edit|--no-edit --amend", cmd):
    kind = "commit"
else:
    sys.exit(0)


def quoted_after(flags):
    m = re.search(r"(?:^|\s)(?:%s)[ =](\"(?:[^\"\\]|\\.)*\"|'[^']*')" % "|".join(flags), cmd)
    return m.group(1)[1:-1] if m else None


def file_after(flags):
    m = re.search(r"(?:^|\s)(?:%s)[ =]([^\s;&|]+)" % "|".join(flags), cmd)
    if not m:
        return None
    try:
        return open(m.group(1)).read()
    except OSError:
        refuse(f"BODY FILE {m.group(1)} does not exist yet, so nothing can be checked. Write it with the Write tool first, then run the create command on its own, with a literal path.")


heredoc = re.search(r"<<-?\s*'?\"?(\w+)'?\"?\n(.*?)\n\s*\1\b", cmd, re.S)
heredoc = heredoc.group(2) if heredoc else None

if kind == "commit":
    msg = file_after(["-F", "--file"]) or heredoc or quoted_after(["-m", "--message"]) or ""
    title, _, body = msg.partition("\n")
else:
    title = quoted_after(["--title", "-t"]) or ""
    body = file_after(["--body-file", "-F"]) or heredoc or quoted_after(["--body", "-b", "--description", "-d"]) or ""

if not title and not body:
    sys.exit(0)

try:
    branch = subprocess.run(["git", "branch", "--show-current"], capture_output=True, text=True, timeout=5).stdout.strip()
except Exception:
    branch = ""
is_fix = bool(re.match(r"(hot)?fix\b", title, re.I) or re.match(r"(hot)?fix/", branch))
is_adr = bool(re.search(r"\badr\b", title, re.I))

prose = re.sub(r"```.*?```", "", body, flags=re.S)
prose = re.sub(r"`[^`\n]*`", "", prose)
text = title + "\n" + prose
fail = []

disabled = {r.strip().upper() for r in os.environ.get("TEXT_LINT_DISABLE", "").split(",") if r.strip()}
on = lambda rule: rule not in disabled

FIX_PHRASES = [r"until now", r"previously", r"never reached", r"was missing", r"were missing",
               r"nothing (did|sent|was|reached|published|handled)", r"had no way to", r"there was no way to"]
phrases_file = os.environ.get("TEXT_LINT_PHRASES")
if phrases_file:
    try:
        with open(os.path.expanduser(phrases_file)) as fh:
            FIX_PHRASES = [l.strip() for l in fh if l.strip() and not l.lstrip().startswith("#")]
    except OSError:
        pass

if on("DASH") and re.search(r"[—–]| -- ", text):
    fail.append("DASH: em-dash, en-dash or ' -- ' in prose. Use a comma, parentheses or a period.")

if on("TEST_PLAN") and re.search(r"^#+\s*test plan", prose, re.I | re.M):
    fail.append("TEST PLAN: no Test plan section, CI is the test plan.")

if on("WORTH_KNOWING") and re.search(r"^#+\s*worth knowing", prose, re.I | re.M):
    fail.append("WORTH KNOWING: drop the section. If a caveat blocks the reviewer, say it in one line.")

if on("CONTEXT_SOLUTION") and kind == "pr" and not is_fix and not is_adr and re.search(r"^#+\s*(context|problem|solution)\b", prose, re.I | re.M):
    fail.append("CONTEXT/SOLUTION on a non-fix PR: say what the change adds in one or two sentences.")

if on("FIX_FRAMING") and kind != "issue" and not is_fix and FIX_PHRASES:
    hit = re.search(r"\b(%s)\b" % "|".join(FIX_PHRASES), text, re.I)
    if hit:
        fail.append(f"FEATURE FRAMED AS A FIX ('{hit.group(0)}'): describe what it adds, in the present tense.")

if on("TABLE") and kind != "commit" and re.search(r"^\s*\|.*\|\s*\n\s*\|[\s:|-]+\|\s*$", prose, re.M):
    fail.append("TABLE: use bullets.")

if on("HARD_WRAP") and kind != "commit":
    lines = prose.splitlines()
    plain = lambda l: l.strip() and not re.match(r"\s*([-*+>#|]|\d+\.)", l)
    if any(plain(a) and plain(b) and len(a) >= 50 and not a.rstrip().endswith((".", ":", "?", "!")) for a, b in zip(lines, lines[1:])):
        fail.append("HARD WRAP: a paragraph is broken over several lines. Put each paragraph on one line.")

if on("REVIEW_TITLE") and re.search(r"\b(address(ed|ing)? (the )?review|apply suggestions|review (comments|feedback|fixes)|fix review)\b", title, re.I):
    fail.append(f"TITLE '{title}': say what changed, not that it answers a review.")

if not fail:
    sys.exit(0)

reason = f"text-lint refused this {kind}.\n\n" + "\n".join(f"{i}. {f}" for i, f in enumerate(fail, 1))
reason += "\n\nFix the text. To ship anyway, append `# text-lint-override: <reason>` to the command."
print(json.dumps({"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny", "permissionDecisionReason": reason}}))
