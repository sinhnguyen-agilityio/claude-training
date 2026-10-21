#!/bin/sh
# Pre-commit checks for the MCP sample. Called from user-management/.husky/pre-commit.
cd "$(dirname "$0")" || exit 1

PY=python
[ -x .env/Scripts/python.exe ] && PY=.env/Scripts/python.exe
[ -x .env/bin/python ] && PY=.env/bin/python

files=$(git diff --cached --relative --name-only --diff-filter=ACMR -- '*.py')
[ -z "$files" ] && exit 0

# shellcheck disable=SC2086
"$PY" -m ruff check $files && "$PY" -m ruff format --check $files
