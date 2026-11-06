---
name: pr-walkthrough
description: Publish a reviewer walkthrough of a pull request as a private artifact page - summary, why, files in reading order, AC to test table, assumptions, risks, how to verify - and link it from the PR. Use when asked for a PR walkthrough, a guided tour of a PR, or a page that explains a PR to reviewers.
tools: Read, Grep, Glob, Bash, AskUserQuestion
user-invocable: true
---

# PR walkthrough

Pipeline step 7 in `WORKFLOW.md`. A reviewer opens one page and knows what the PR does, where to
start reading and what to check.

## Usage

```text
/pr-walkthrough #31
```

## 1. Read the PR

1. `gh pr view <n> --json number,title,url,body,headRefName,baseRefName,headRefOid,additions,deletions,changedFiles,files,commits`.
2. `gh pr diff <n>`, and read each changed file in full where the diff needs context.
3. Read the linked issue (`Closes #<i>` in the body): its ACs and its Assumptions section.

## 2. Write the page

Read the artifacts server's `guide` (topics `pages` and `design`) before the first publish in a
session. The page opens with a line of facts: the branch, the head commit (`headRefOid`, 7
characters) and the file and line totals. A page describes one commit, and this line lets a reader
see that the PR has moved on since. Then these sections:

1. **Summary**: at most 3 sentences. What changes for the user or the developer.
2. **Why**: the problem, and the issue link.
3. **Read in this order**: each file (or group of files) with a link to it on GitHub
   (`<repo>/blob/<head sha>/<path>`), its role, and what the reviewer should check there.
   Start with the entry point or the test that states the behaviour, not alphabetical order.
4. **Code changes**: the actual diff, shown under each file in the reading order. See
   [Showing the code changes](#showing-the-code-changes). Skip this section only when the PR
   changes no code (for example, only images).
5. **AC → test**: `AC | Test file / name | Level`.
6. **Assumptions to confirm**: from the issue, each with the default that was taken.
7. **Risks**: what could break, and where.
8. **Verify locally**: the commands (`gh pr checkout <n>`, `pnpm install`, `pnpm dev`, and the
   steps to see the change).

Keep the facts exact: file paths, test names and commands copied from the PR, never paraphrased.

### Showing the code changes

The page is the only thing some reviewers open, so it carries the diff itself. It cannot fetch
from GitHub, so paste the diff text into the page.

- Take it from `gh pr diff <n>`, split per file. Keep each hunk's `@@` header, so the line numbers
  show. Show a changed line as `+` or `-` and a few lines of context around it, as in the diff.
- Put each file's diff in a `<pre>` under that file's entry in "Read in this order", inside a
  `<details>`. Open it (`open`) when the file has at most 60 changed lines; leave it closed with
  the `+n / -n` counts in the `<summary>` when it has more. Never leave a diff unreachable.
- Escape `&`, `<` and `>` as HTML entities. Color added lines with a green token and removed lines
  with a red token, and keep the `+` and `-` characters, so the diff reads without color too.
  Style them through the page's theme tokens, light and dark (see the `design` guide).
- Let a long line scroll sideways inside its `<pre>` (`overflow-x: auto`). Never wrap it, never
  clip it.
- A new file has only added lines: show it in full when it has at most 60 lines, otherwise the part
  that carries the behaviour (the function or block the reviewer must check), with a link to the
  whole file at the head commit.
- Skip the diff, and say so, for: the lock file, generated files, binary files and renames with no
  edits. For a very large PR (over about 1,500 changed lines), show diffs for the files that carry
  the behaviour and tests, and link the rest.
- Copy the diff exactly. Do not reformat, abbreviate or "clean up" code in it, and do not invent
  lines. If a diff is shortened, the page says where.
- Right under the diff, one or two lines say what to check in it. Do not repeat the diff in words.

## 3. Publish

- The title is `PR #<n> walkthrough: <PR title>`.
- Look for a `Walkthrough: <url>` line in the PR body. If one exists, republish that artifact (its
  slug is in the URL; read its current version first). Otherwise create a new one.
- The artifact starts private. Print its URL and say that only the author can share it (the
  sharing controls are on claude.ai, not in this tool).
- Say that the page describes the head commit shown at its top. Run `/pr-walkthrough #<n>` again
  after new commits (for example fixes for review comments) and before the merge; it republishes
  the same artifact.

## 4. Link it (ask first)

If the PR body has no `Walkthrough:` line, ask, then add `Walkthrough: <url>` at the end of the
body with `gh pr edit <n> --body-file <file>`. Do not change the rest of the body.

## Rules

- Do not post comments or change code.
- If the PR has no linked issue, say so in the Why section instead of inventing a reason.
