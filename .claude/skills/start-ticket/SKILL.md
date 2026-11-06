---
name: start-ticket
description: Start work on a GitHub issue - read it, ask the open questions one at a time, record unanswered ones as assumptions, run the readiness check, then create the branch or worktree and plan the change in plan mode. Use when asked to start, pick up, refine or plan an issue, e.g. "/start-ticket #12".
tools: Read, Grep, Glob, Bash, AskUserQuestion, EnterPlanMode, ExitPlanMode
user-invocable: true
---

# Start ticket

Pipeline steps 1–3 in `WORKFLOW.md`: clarify, branch, plan. It stops at every gate and never
edits code before the plan is approved.

## Usage

```text
/start-ticket #12
```

## 1. Read the ticket

1. `gh issue view <n> --json number,title,state,labels,body,comments`.
   - Not found: print `Issue #<n> not found` and stop.
   - Closed: print `Issue #<n> is closed` and stop.
   - No `enhancement` or `bug` label (issues opened in the web UI have none): ask whether it is a
     Feature, a Bug, or a Chore (tooling/docs), multiple choice. Apply the answer's label after
     asking (`gh issue edit <n> --add-label enhancement|bug`; a chore keeps `enhancement`), and
     use the answer for the format and the branch type.
2. Read `docs/SPEC.md`, `CLAUDE.md` and the code the issue touches (Grep). For an unfamiliar area,
   ask the `code-explorer` subagent instead of reading many files yourself.
3. Analyse it with the ticket-pack method (`.claude/skills/ticket-pack/SKILL.md`, steps 2–5): the
   acceptance criteria, the gaps and the open questions with defaults. A bug uses the format in
   `.claude/skills/bug-report/SKILL.md` instead.

Print the open questions as a short list (ID, priority, one line each) and the current verdict.
Change nothing yet.

**Fast path.** An issue written by `/ticket-pack` has already been through the questions. When its
`Open questions` section says `None` or has no rows, and it has an `Assumptions` section (`None`
counts), asking again only repeats work. Skip steps 2 and 4 and state the three readiness results
of step 3 in one line, each taken from the body. Show that line with the branch question of step 5,
so the developer confirms both at once. If reading the code turns up a gap the issue does not
cover, say so and use the full path instead.

## 2. Ask, one question at a time

Ask each open question with AskUserQuestion, Blockers first:

- One question per call, multiple choice, 2–4 options. The default is the first option and is
  labelled "(Recommended)".
- The question must stand on its own: name the AC or file it is about.
- Read each answer before asking the next. "Other" answers often change later questions.

When the developer skips a question or says "use the defaults", that question becomes an
**assumption**, a row in the issue's Assumptions table: `ID | Question | Default taken | Why |
Affects`, with IDs `A1`, `A2`… and the AC IDs in Affects. Features, bugs and PRs all use this table.

## 3. Readiness check (gate G1)

All three must pass:

| Check                | Passes when                                                       |
| -------------------- | ----------------------------------------------------------------- |
| **What it asks**     | The outcome fits in one sentence.                                 |
| **What's ambiguous** | Every open question is answered or recorded as an assumption.     |
| **First step**       | The first concrete action is named (a file, a test or a command). |

Report each check as pass or fail with the reason. Any failure makes the verdict **Not ready**:
say what is missing and stop.

## 4. Update the issue

Show the new issue body in the Feature format (`ticket-pack` → Template) or the Bug format
(`bug-report` → Template), with the answers folded into the ACs and the assumptions table filled
in. Write it with `gh issue edit <n> --body-file <file>` only after the developer approves. Use a
temp file in the scratchpad for the body.

## 5. Branch (ask first)

Propose `<type>/<n>-<slug>`:

- `fix` for a bug, `chore` or `docs` when only tooling or docs change, `feat` otherwise (from the
  label, or the answer in step 1);
- the slug is a kebab-case form of the title, at most 5 words of lowercase letters and digits
  (`WORKFLOW.md` rule 2). The whole name must match
  `^(feat|fix|docs|test|refactor|perf|ci|build|chore|revert)/[0-9]+-[a-z0-9]+(-[a-z0-9]+){0,4}$`,
  or `.husky/pre-push` and `block-forbidden` reject it. Example: `feat/12-add-export`.

Ask: the current checkout, or a new worktree (for parallel work, see `WORKFLOW.md` → Parallel
work: run `pnpm install` there and use `E2E_PORT`). If the branch already exists, offer to switch to
it. Never branch from anything but an up-to-date `main`.

## 6. Plan (gate G2)

Enter plan mode. The plan has these sections:

- **Context**: the issue link and the outcome in two sentences.
- **Steps**, in order.
- **Files**: path, the change, why.
- **AC → test**: AC, level (unit, component or E2E), test file. A bug starts with the failing test
  that reproduces it.
- **Risks**.
- **Assumptions used**: the IDs from the issue.

Iterate on the developer's comments, then call ExitPlanMode. Edit no file before approval. After
approval, implement tests first, then run `/ship`.

## Rules

- Never create a branch, edit the issue or post a comment without asking.
- Never invent an answer: an unanswered question is an assumption, written down.
- Issues in this repo are written in English, whatever language the conversation is in.
