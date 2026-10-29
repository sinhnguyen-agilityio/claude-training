---
name: review-checklist
description: Review a pull/merge request or branch diff, in order - correctness, tests, readability, security basics, scope - and produce at least 3 actionable comments with file:line and a verdict. Use when asked to review a PR/MR, a partner's branch, or "my changes" before asking for review.
tools: Read, Grep, Glob, Bash
user-invocable: true
---

# Review Checklist

The team's code-review checklist as a repeatable process. Use it for every review, of your own
branch before asking for review, or of a partner's PR/MR. It reviews **one change**, unlike
`release-checklist`, which gates a whole release.

## Usage

```
/review-checklist            # current branch vs main
/review-checklist 2          # GitHub PR #2 (or GitLab MR !2)
/review-checklist feat/x     # another branch vs main
```

## 1. Gather the change

1. Work out the target from the argument: a PR/MR number, a branch, or (default) the current branch.
2. Get the diff and the commit list against the merge base with `main`:
   - Branch: `git diff main...<branch>` and `git log --oneline main..<branch>`.
   - PR/MR: read the title, description and diff through the GitHub or GitLab tools if they are
     available. Otherwise fetch the source branch and diff it locally.
3. Read `WORKFLOW.md` and `CLAUDE.md`, plus `docs/architecture.md` and `docs/testing.md` when the diff
   touches the API layer or tests. **Project rules beat generic advice.**
4. Read each changed file in full, not only the hunks. Trace callers with Grep when a finding
   depends on how the code is used.

## 2. Walk the checklist in order

Do not skip ahead. A correctness bug matters more than a naming nit, so the order is the priority.

### 1) Correctness

- Does the code do what the linked issue / SPEC acceptance criteria ask? Check edge cases: empty,
  missing, invalid, duplicate, very long, concurrent, and network-failure inputs.
- Error handling: errors are surfaced to the user or caller, never swallowed.
- State and async: stale closures, missing cleanup of listeners and timers, race conditions,
  cache invalidation (`userKeys`).
- Shell scripts: quoting, exit codes, behaviour on Windows (Git Bash) as well as Linux CI.
- Validation rules changed on **both** sides: `schema.ts` / `query.ts` are shared by the form and
  the mock API, so they must not be edited in only one place.

### 2) Tests

- New behaviour has tests, and a bug fix starts with a test that failed before the fix.
- Tests check behaviour, not implementation. Pages and routes are rendered
  with `renderRoute()`, network goes through the MSW node server with `server.use(...)`, and
  TanStack Query hooks and `fetch` are never mocked.
- No fixed sleeps (`setTimeout`, `waitForTimeout`). Tests wait for content, or use fake timers.
- No CSS or Tailwind class assertions in jsdom tests. Visual checks belong in Playwright.
- The 80% coverage threshold is not lowered. Each SPEC feature keeps an E2E journey.
- The WORKFLOW step 5 checks for each touched project pass. Run them, or ask the author for the result.

### 3) Readability

- Names say what things are. Functions do one thing. Early returns over deep nesting.
- Comments explain _why_, match the code, and cite the SPEC where relevant (`SPEC F4`, `SPEC §4`).
- Matches the surrounding code: `@/` imports, no `any`, enums or parameter properties.
- No dead code, commented-out code, debug logging or leftover TODOs without an issue.

### 4) Security basics

- No secrets, tokens or credentials in code, config, tests or logs.
- External input is validated at the boundary (Zod schemas).
- No unsafe HTML (`dangerouslySetInnerHTML`), `eval`, or string-built shell commands from
  untrusted input. Hooks and scripts that run automatically on developer machines get extra care.
- Error messages don't leak internals. Dependencies added are justified and from trusted sources.

### 5) Scope

- The change does what its issue asks and nothing more. Unrelated refactors belong in their own MR.
- No features from SPEC §7 "Out of scope" without an issue that changes the spec.
- Docs updated when behaviour or commands change (README, CLAUDE.md, SPEC, WORKFLOW).
- Process: branch named `feat|fix/<issue>-<slug>`, conventional commit messages, and the PR/MR
  description references the issue (`Closes #<n>`).

## 3. Rules for comments

- Give **at least 3 actionable comments**. If the change is genuinely clean, give fewer and say
  so. Never pad the list with nitpicks a linter or formatter would catch.
- Every comment must be verified in the actual code. If you are not sure, phrase it as a question.
- Each comment names a location, the problem, why it matters, and a concrete fix.
- Severity: **blocker** (must fix before merge), **major** (should fix), **minor** (nice to have),
  **question** (needs the author's answer).
- Do not edit files and do not post comments yourself. The reviewer decides which comments to
  keep, then posts them.

## Output format

```markdown
## Review: <PR/branch title>

**Scope reviewed:** <files / commits> · **Checks run:** <commands and results, or "not run">

| #   | Area        | Severity | Location               | Comment                                          |
| --- | ----------- | -------- | ---------------------- | ------------------------------------------------ |
| 1   | Correctness | blocker  | `path/file.ts:42`      | <problem> - <why it matters>. **Suggest:** <fix> |
| 2   | Tests       | major    | `path/file.test.ts:10` | ...                                              |
| 3   | Scope       | minor    | PR description         | ...                                              |

### Checklist

- [x] Correctness - <one line>
- [ ] Tests - <what is missing>
- [x] Readability
- [x] Security basics
- [x] Scope

### Verdict

**Request changes** | **Approve** | **Approve with comments** - <one sentence why>
```
