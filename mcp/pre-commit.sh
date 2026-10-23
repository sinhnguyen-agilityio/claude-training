#!/bin/sh
# Pre-commit checks for the MCP sample. Called from user-management/.husky/pre-commit.
cd "$(dirname "$0")" || exit 1

files=$(git diff --cached --relative --name-only --diff-filter=ACMR -- '*.py')
[ -z "$files" ] && exit 0

# Uses the first Python that has ruff: .venv (documented), then .env (older name), then PATH.
# Virtualenv paths that do not exist are skipped without starting Python.
PY=
for candidate in .venv/Scripts/python.exe .venv/bin/python .env/Scripts/python.exe .env/bin/python python3 python; do
  case $candidate in */*) [ -x "$candidate" ] || continue ;; esac
  if "$candidate" -m ruff --version >/dev/null 2>&1; then
    PY=$candidate
    break
  fi
done
if [ -z "$PY" ]; then
  echo "mcp pre-commit: ruff not found. Run: pip install -r mcp/requirements-dev.txt (inside mcp/.venv)" >&2
  exit 1
fi

# shellcheck disable=SC2086
"$PY" -m ruff check $files && "$PY" -m ruff format --check $files
