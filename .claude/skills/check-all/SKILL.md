---
name: check-all
description: Run the repo's checks (lint, typecheck, coverage tests, E2E, and the .claude hook tests when .claude/ changed) and summarise what failed, without committing anything. Use when asked to run all checks, verify the branch is green, or before /ship when you only want the results.
tools: Read, Grep, Glob, Bash
user-invocable: true
disable-model-invocation: true
---

# Check all

The "Checks" list in `WORKFLOW.md`, run on demand and reported. Unlike `/ship`, it never opens a
diff, commits, pushes or opens a PR.

## Usage

```text
/check-all          # lint, typecheck, test:coverage, e2e (+ hook tests if .claude/ changed)
/check-all fast     # skip e2e
```

## Steps

1. Run, in order, and keep going after a failure so the report shows everything that is red:
   1. `pnpm lint`
   2. `pnpm typecheck`
   3. `pnpm test:coverage`
   4. `pnpm e2e`, skipped for `fast`. In a worktree, set `E2E_PORT` to a free port.
   5. `node --test .claude/hooks/*.test.mjs`, only when `git diff --name-only main...HEAD` plus the
      working tree touch `.claude/`.
2. Run each as `<command> > <scratchpad>/<check>.log 2>&1; echo exit=$?`, so the full output is
   kept and the exit code is not lost.
3. Report one table: check, result (pass / fail / skipped), and for a failure the failing test or
   file and the last 20 lines of its log. Say whether the code or the test looks wrong.
4. A failure is rerun once. If the rerun passes, mark it **possibly flaky** and name the test; do not
   call it green.

## Rules

- Never fix anything or change a coverage threshold in this skill. It only reports.
- Never skip the Husky hook or lower the 80% threshold to get a result.
