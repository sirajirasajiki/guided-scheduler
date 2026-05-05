#!/usr/bin/env python
# PreToolUse hook: block access to sensitive files
# Workaround for Claude Code deny rule bug (anthropics/claude-code#27040)
import sys
import json
import re

SENSITIVE_FILE_PATTERNS = [
    r"\.env($|\.)",
    r"\.pem$",
    r"credentials",
    r"secrets[/\\]",
]

SHELL_ENV_PATTERNS = [
    r"(cat|grep|head|tail|less|more|type|source)\s+\S*\.env",
    r"Get-Content\s+\S*\.env",
    r"\.\s+\S*\.env",
]


def is_sensitive_file(path):
    return any(re.search(p, path, re.IGNORECASE) for p in SENSITIVE_FILE_PATTERNS)


def is_shell_env_access(cmd):
    return any(re.search(p, cmd, re.IGNORECASE) for p in SHELL_ENV_PATTERNS)


def block(reason):
    print(json.dumps({"decision": "block", "reason": reason}))
    sys.exit(0)


try:
    data = json.load(sys.stdin)
    tool = data.get("tool_name", "")
    inp = data.get("tool_input", {})

    file_path = inp.get("file_path", "")
    if file_path and is_sensitive_file(file_path):
        block(f"Sensitive file access denied: {file_path}")

    if tool == "Bash":
        cmd = inp.get("command", "")
        if is_shell_env_access(cmd):
            block(f"Shell access to .env file denied: {cmd[:60]}")

except SystemExit:
    raise
except Exception:
    pass

sys.exit(0)
