---
name: bug-report
description: Turn a rough bug description, log or screenshot into a structured bug report - steps to reproduce, expected vs actual result, environment - and ask for anything missing instead of guessing. Use when asked to write, file or clean up a bug report, or when something does not work and nobody has described it yet.
tools: Read, Grep, Glob, Bash
user-invocable: true
---

# Bug report

Turn what the user pasted into a report someone else can reproduce without asking questions. The
output follows the Bug issue template (`.github/ISSUE_TEMPLATE/bug.md`), so it can be pasted into
an issue unchanged.

## Usage

```text
/bug-report The export button does nothing sometimes
/bug-report <paste a console log or describe a screenshot>
```

## 1. Gather facts

1. Read everything the user gave: the description, logs, stack traces, screenshots.
2. Fill the environment yourself where you can. Run `git rev-parse --short HEAD` and
   `git branch --show-current` for the commit and branch, and read `package.json` for framework
   versions. Do not invent a browser, OS or data state; those come from the user.
3. Find the code path with Grep when the symptom names a feature, so the report can point at the
   file. Do not fix anything.

## 2. Write the report

Use these sections, in this order:

- **Summary**: one sentence, what is wrong. Not a guess at the cause.
- **Environment**: commit or branch, browser and version, OS, data state (fresh seed data, or what
  changed before the bug).
- **Steps to reproduce**: numbered, each one a single action a stranger can do. Start from a known
  state (a fresh page, the seed data).
- **Expected result** and **Actual result**: the exact text, status code or behaviour, not "it
  breaks".
- **Frequency**: how many attempts failed out of how many, for example "3 of 5".
- **Evidence**: console errors and stack traces as pasted text.
- **Failing test**: leave this for the fix. A bug fix starts with a failing test (`WORKFLOW.md`).

## 3. Ask instead of guessing

If steps, expected result or environment are missing, list them as **Questions for the reporter**
at the end, each with the reason it matters. Never fill a gap with a plausible value. Mark a report
**Not reproducible yet** until the steps are confirmed.

## Rules

- Do not edit files, open issues or post comments. Output the report in the chat.
- Quote logs verbatim and keep them short; trim to the relevant lines.
- One bug per report. If the description holds two problems, write two reports.
