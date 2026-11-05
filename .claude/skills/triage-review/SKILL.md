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

## 1. Collect the comments

```bash
gh api graphql -F owner=<owner> -F repo=<repo> -F n=<pr> -f query='
query($owner:String!,$repo:String!,$n:Int!){repository(owner:$owner,name:$repo){pullRequest(number:$n){
  author{login}
  reviewThreads(first:100){nodes{id isResolved isOutdated path line
    comments(first:20){nodes{id databaseId body url author{login __typename}}}}}
  comments(first:100){nodes{databaseId body url createdAt author{login __typename}}}
  reviews(first:50){nodes{body state url submittedAt author{login __typename}}}}}}'
```

Two kinds of item come back:

- **Threads** with `isResolved: false`. A thread is from a **bot** when its first comment's
  `author.__typename` is `Bot`.
- **Items without a thread**: conversation `comments` and `reviews` with a non-empty body whose
  author is not the PR author. The CI review is usually one of these, a single comment with
  several suggestions. Mark an item **answered?** when the PR author wrote a later conversation
  comment. This only flags it; the developer decides in step 2.

A review body that repeats points already in a thread is listed once, under the thread. A body
with no suggestion in it (a bare approval) is left out. The query reads at most 100 comments and
50 reviews: if a list is full, say that older items were not read.

If there are no unresolved threads and no items without a thread, print
`No unresolved review comments or reviews on #<pr>` and stop.

## 2. Propose verdicts

For each thread, read the code at `path:line` (and the file around it) before judging. Verify the
claim; a reviewer, human or bot, can be wrong. A comment with several suggestions gets one row per
suggestion. Print one table:

`# | Author (bot/human) | file:line | Comment (excerpt) | Verdict | Reason`

The `file:line` cell is `-` for an item without a thread, and its Comment cell says `(answered?)`
when it is flagged. A flagged item gets the verdict **skip** by default: no reply, so running the
skill again on a PR that was already triaged does not post the same answers twice. The developer
can change it. Ask the developer to confirm or change verdicts. Post nothing and edit nothing
before that.

## 3. Apply

1. **fix**: make all the fixes, then run the checks from `/ship` step 1. Show the diff, ask, commit
   (`fix:` or the type of the change) and push. Reply to each fixed thread with
   `Fixed in <short sha>: <one line>`.
2. **leave**: reply with the reason.
3. **ask why**: reply with the question.

Reply in the thread with
`gh api repos/<owner>/<repo>/pulls/<pr>/comments/<databaseId of the first comment>/replies -f body=...`.

Items without a thread have nowhere to reply in. Post **one grouped comment** with
`gh pr comment <pr> --body-file <file>`: a line per suggestion with its verdict and reason, and the
short sha for a fix.

## 4. Resolve bot threads only

After the push, resolve a thread only when its verdict was **fix** and a bot started it:

```bash
gh api graphql -f query='mutation($id:ID!){resolveReviewThread(input:{threadId:$id}){thread{isResolved}}}' -f id=<thread id>
```

Threads started by a person stay open; the reviewer resolves them after checking the fix. Items
without a thread are never resolved: there is nothing to resolve.

## Rules

- Never reply, push or resolve before the table is confirmed.
- One reply per thread, and one grouped comment for all items without a thread. Keep each short and
  specific.
- A fix that grows beyond the comment's scope becomes a new issue, not part of this PR.
