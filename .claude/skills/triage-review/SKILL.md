---
name: triage-review
description: Triage the unresolved review comments on a pull request - propose fix, leave or ask why for each thread, confirm the table with the developer, then apply the fixes and reply. Use when asked to handle, answer, address or triage review comments on a PR.
tools: Read, Grep, Glob, Edit, Write, Bash, Skill, AskUserQuestion
user-invocable: true
---

# Triage review

Pipeline step 8 in `WORKFLOW.md`. Every review comment gets one of three answers, and the developer
confirms each one before anything is posted.

| Verdict     | When                                                        | Action                                                      |
| ----------- | ----------------------------------------------------------- | ----------------------------------------------------------- |
| **fix**     | The comment is right and in scope.                          | Change the code, then reply `Fixed in <short sha>: <line>`. |
| **leave**   | It is wrong, out of scope, or a deliberate choice.          | Reply with the reason (cite SPEC, CLAUDE.md or the issue).  |
| **ask why** | It is unclear, or it would need a decision from the author. | Reply with one concrete question.                           |

## Usage

```text
/triage-review #31
```

## 1. Collect the unresolved threads

```bash
gh api graphql -F owner=<owner> -F repo=<repo> -F n=<pr> -f query='
query($owner:String!,$repo:String!,$n:Int!){repository(owner:$owner,name:$repo){pullRequest(number:$n){
  reviewThreads(first:100){nodes{id isResolved isOutdated path line
    comments(first:20){nodes{id databaseId body url author{login __typename}}}}}}}}'
```

Keep the threads with `isResolved: false`. A thread is from a **bot** when its first comment's
`author.__typename` is `Bot` (for example the CI review). If none are left, print
`No unresolved review comments on #<pr>` and stop.

## 2. Propose verdicts

For each thread, read the code at `path:line` (and the file around it) before judging. Verify the
claim; a reviewer, human or bot, can be wrong. Print one table:

`# | Author (bot/human) | file:line | Comment (excerpt) | Verdict | Reason`

Ask the developer to confirm or change verdicts. Post nothing and edit nothing before that.

## 3. Apply

1. **fix**: make all the fixes, then run the checks from `/ship` step 1. Show the diff, ask, commit
   (`fix:` or the type of the change) and push. Reply to each fixed thread with
   `Fixed in <short sha>: <one line>`.
2. **leave**: reply with the reason.
3. **ask why**: reply with the question.

Reply in the thread with
`gh api repos/<owner>/<repo>/pulls/<pr>/comments/<databaseId of the first comment>/replies -f body=...`.

## 4. Resolve bot threads only

After the push, resolve a thread only when its verdict was **fix** and a bot started it:

```bash
gh api graphql -f query='mutation($id:ID!){resolveReviewThread(input:{threadId:$id}){thread{isResolved}}}' -f id=<thread id>
```

Threads started by a person stay open; the reviewer resolves them after checking the fix.

## Rules

- Never reply, push or resolve before the table is confirmed.
- One reply per thread. Keep it short and specific.
- A fix that grows beyond the comment's scope becomes a new issue, not part of this PR.
