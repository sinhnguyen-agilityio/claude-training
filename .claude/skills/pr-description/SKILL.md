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

- **What**: what changed and in which modules, who is affected. Mention anything that is not
  obvious from the title, such as a new dependency or a changed public behaviour.
- **Why**: `Closes #N`, the problem in one or two sentences, and why this approach over the obvious
  alternative.
- **Assumptions**: copy the issue's assumptions (`ID | Default taken | Affects`) and ask the reviewer to
  confirm them. "None" when the issue has none.
- **How tested**: how a reviewer tests the change by hand, as steps they can follow. It is not a
  list of commands that passed. For a new feature A: how to run the app, which screen to open, what
  to select and click, and what they should see. Write it as:
  1. **Setup**: the commands (`pnpm install`, `pnpm dev`, the URL), and any data or state needed
     first (a seed user, a filter, a reset).
  2. **Steps**: a numbered list, one action each (open the screen, choose an option, click a
     button), with the expected result after each action or group of actions. Name the labels,
     buttons and routes as they appear in the app, copied from the code.
  3. **Edge cases**: the failure and empty paths to try (invalid input, a 409, no results, a
     reload, 375 px wide), each with its expected result.
  4. **Automated**: one line with the checks that ran and their result (`pnpm lint`,
     `pnpm typecheck`, `pnpm test:coverage`, `pnpm e2e`) and the tests that cover the change. Run
     the commands if no result is on record; never claim a pass you did not see, and say which
     did not run.

  Use the acceptance criteria as the steps' checklist: every AC is covered by at least one step.
  For a change with no screen (a hook, a skill, a config file), the steps are how to trigger it
  (the command, the edit to make) and what the reviewer should see. Do not run the steps yourself
  and report them as done unless you did.

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

**Setup**

**Steps**

1. <action> -> <expected result>

**Edge cases**

- <case> -> <expected result>

**Automated**

## Risk

## Evidence

Walkthrough: -
```

## Rules

- Do not add a "Generated with Claude Code" or `Co-Authored-By` line. This repo's rule is that
  commit messages and PR and MR descriptions carry no such line.
- Do not open the PR, push or comment. Output the description in the chat for the author to paste,
  or hand it to `/ship`, which opens the PR.
- Keep it short. A reviewer skims; What says what changed, and the Risk section says what could
  break.
