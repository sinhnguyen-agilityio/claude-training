---
name: ship
description: Take the current branch from "code done" to an open pull request - run the checks, open a VS Code diff per changed file with a summary, run /code-review, then commit, push and open the PR after asking at each step. Use when asked to ship, finish, wrap up or open a PR for the current branch.
tools: Read, Grep, Glob, Bash, Skill, AskUserQuestion
user-invocable: true
---

# Ship

Pipeline steps 5–6 in `WORKFLOW.md`: self-check, then the pull request. Every step that leaves the
machine (commit, push, PR) waits for an explicit yes.

## Usage

```text
/ship           # the current branch against main
/ship #12       # name the issue if the branch name has no number
```

## 1. Checks

Refuse on `main` or `master`. Then run, in order, stopping at the first failure:

1. `pnpm lint`
2. `pnpm typecheck`
3. `pnpm test:coverage`
4. `pnpm e2e` (in a worktree, set `E2E_PORT` to a free port)
5. `node --test .claude/hooks/*.test.mjs`, only when `git diff --name-only main...HEAD` plus the
   working tree touch `.claude/`

Run each check as `<command> > <scratchpad>/<check>.log 2>&1; echo exit=$?`, so the full output is
kept and the exit code is not lost. A test name that scrolled past is gone, which is how a flaky
test in #26 went unidentified.

On a failure, rerun that one check once. If it fails again, show the command and the last 40 lines
of the log (`tail -n 40`), say whether the code or the test looks wrong, and stop. Do not commit.

If the rerun passes, the check is **possibly flaky**, not fine. Name the failing test from the
first log, tell the developer, and offer to open an issue for it (ask first). Then go on. Do not
carry on silently: a CI that goes red at random teaches people to ignore red.

## 2. Diff pane and summary

Compare against the merge base, not against `main`. Once `main` moves ahead, `main` holds other
PRs' changes, which would show as reverted by this branch. Set `BASE=$(git merge-base main HEAD)`,
then list `git diff --name-status -M $BASE` plus the untracked files from `git status --porcelain`.
For each file:

- **Modified** (`M`): write the base version to the scratchpad with
  `git show $BASE:<path> > <scratchpad>/base/<path>`, then
  `code --diff <scratchpad>/base/<path> <path>`.
- **Renamed** (`R<score> <old> <new>`): the same, with `git show $BASE:<old>` on the left and
  `<new>` on the right.
- **Added** (`A`, or untracked): `code <path>`.
- **Deleted** (`D`): list only.

In a shell loop, run `code ... < /dev/null`. Otherwise `code` reads the loop's stdin, prints "To
read from stdin, append '-'", and the files after it are skipped.

Then print a table: `File | +/− | What changed and why`. The "why" points to the AC or the plan
step.

## 3. Local review (gate G3)

Run `/code-review` on the branch diff and list its findings. Stop and wait. The developer comments
on the diff or the findings, Claude fixes, and steps 1–3 run again until the developer says OK.

## 4. Commit and push (ask each time)

1. Propose the commit messages in the `WORKFLOW.md` rule 3 format, `type(scope)!: description`:
   a type from `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `ci`, `build`, `chore`, `revert`;
   the whole header at most 72 characters, imperative, lowercase first letter, no trailing period;
   the SPEC or issue tag at the end where relevant (`(F4)`, `(#32)`); one commit per logical
   change. The `.husky/commit-msg` hook rejects anything else. Use the same format for the PR title. No `Co-Authored-By` or
   "Generated with Claude Code" line (`CLAUDE.md`), whatever the tool's default is.
2. Add an entry under `## [Unreleased]` in `CHANGELOG.md` (Added, Changed, Fixed or Removed), in
   the same style as the existing entries.
3. Ask, then commit. Never use `--no-verify`. If a git hook rejects the commit, show its message
   and stop.
4. Ask, then `git push -u github <branch>` (GitHub is the `github` remote; `origin` is GitLab).

## 5. Pull request (ask first)

1. Find the issue from the branch name (`feat/12-...`), the argument or the commits.
2. Write the body in the format of `.claude/skills/pr-description/SKILL.md` → Template, with
   `Closes #<n>` and the assumptions copied from the issue's Assumptions section.
3. The body has **no** "Generated with Claude Code" or `Co-Authored-By` line (`CLAUDE.md`).
4. Show the title and body, ask, then `gh pr create --base main --head <branch> --title ...
--body-file <file>`. If `gh pr view` finds a PR for the branch, offer `gh pr edit --body-file`
   instead.
5. Print the PR URL and suggest the next steps: `/pr-walkthrough #<pr>`, then
   `/loop 5m follow loop.md for PR #<pr>`.

## Rules

- Never claim a check passed without seeing its output.
- Never commit, push or open a PR without a yes for that step.
- Never push to `main` or `master`.
