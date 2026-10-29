---
name: pr-description
description: Write a pull/merge request description from the current branch - what changed, why, how it was tested, evidence - following the PR template. Use when asked to write, draft or update a PR or MR description, or before opening a pull request.
tools: Read, Grep, Glob, Bash
user-invocable: true
---

# PR description

Write the description for the current branch, in the four sections of the PR template
(`.github/pull_request_template.md`): What, Why, How tested, Evidence. A reviewer should be able to
review the change from the description alone.

## Usage

```text
/pr-description            # the current branch against main
/pr-description #12        # also link issue 12
```

## 1. Read the change

1. `git log main..HEAD --oneline` and `git diff main...HEAD --stat` for the scope.
2. Read the diff of the files that matter. Name modules and behaviour, not every file.
3. Find the ticket: an issue number in the branch name (`feat/12-...`), a commit message, or the
   argument. Read it for the reason and the acceptance criteria.

## 2. Write the four sections

- **What**: what changed and in which modules, who is affected. Mention anything that is not
  obvious from the title, such as a new dependency or a changed public behaviour.
- **Why**: `Closes #N`, the problem in one or two sentences, and why this approach over the obvious
  alternative.
- **How tested**: the commands that were run and their results (`pnpm lint`, `pnpm typecheck`,
  `pnpm test:coverage`, `pnpm e2e`), one acceptance criterion to one test. Run them if no result is
  on record; never claim a pass you did not see. Add the edge cases tried by hand.
- **Evidence**: a short list of what to attach (before and after screenshots, a GIF of the flow,
  pasted log text). You cannot capture screenshots, so list them as items for the author to attach.

## Rules

- Do not add a "Generated with Claude Code" or co-author line. This repo's rule is that PR and MR
  descriptions carry no such line.
- Do not open the PR, push or comment. Output the description in the chat for the author to paste.
- Keep it short. A reviewer skims; put the risk in the first lines of What.
