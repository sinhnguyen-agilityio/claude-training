---
name: pr-description
description: Write a pull/merge request description from the current branch - what changed, why, assumptions, how it was tested, risk, evidence - in the repo's PR format. Use when asked to write, draft or update a PR or MR description, or before opening a pull request.
tools: Read, Grep, Glob, Bash
user-invocable: true
---

# PR description

Write the description for the current branch in the format in [Template](#template). A reviewer
should be able to review the change from the description alone. There is no PR template file in
the repo; this section is the format, and `/ship` uses it when it opens the PR.

## Usage

```text
/pr-description            # the current branch against main
/pr-description #12        # also link issue 12
```

## 1. Read the change

1. `git log main..HEAD --oneline` and `git diff main...HEAD --stat` for the scope.
2. Read the diff of the files that matter. Name modules and behaviour, not every file.
3. Find the ticket: an issue number in the branch name (`feat/12-...`), a commit message, or the
   argument. Read it (`gh issue view <n>`) for the reason, the acceptance criteria and the
   Assumptions section.

## 2. Fill in the sections

- **What**: what changed and in which modules, who is affected. Put the risk first. Mention
  anything that is not obvious from the title, such as a new dependency or a changed public
  behaviour.
- **Why**: `Closes #N`, the problem in one or two sentences, and why this approach over the obvious
  alternative.
- **Assumptions**: copy the issue's assumptions (`ID | Default taken | Affects`) and ask the reviewer to
  confirm them. "None" when the issue has none.
- **How tested**: the commands that were run and their results (`pnpm lint`, `pnpm typecheck`,
  `pnpm test:coverage`, `pnpm e2e`), and one row per acceptance criterion in `AC | Test | Result`.
  Run the commands if no result is on record; never claim a pass you did not see. Add the edge
  cases tried by hand.
- **Risk**: what could break, and how it would show. "Low" with one reason is fine.
- **Evidence**: a short list of what to attach (before and after screenshots, a GIF of the flow,
  pasted log text). You cannot capture screenshots, so list them as items for the author to attach.
- **Walkthrough**: leave `Walkthrough: -` until `/pr-walkthrough` fills it in.

## Template

```markdown
## What

## Why

Closes #<n>

## Assumptions

| ID  | Default taken | Affects | Confirmed? |
| --- | ------------- | ------- | ---------- |

## How tested

| AC  | Test | Result |
| --- | ---- | ------ |

## Risk

## Evidence

Walkthrough: -
```

## Rules

- Do not add a "Generated with Claude Code" or co-author line. This repo's rule is that PR and MR
  descriptions carry no such line.
- Do not open the PR, push or comment. Output the description in the chat for the author to paste,
  or hand it to `/ship`, which opens the PR.
- Keep it short. A reviewer skims; put the risk in the first lines of What.
