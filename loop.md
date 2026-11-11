# PR watch loop

The prompt for `/loop` while a pull request is open (pipeline step 9 in [WORKFLOW.md](WORKFLOW.md)).
Start it with:

```text
/loop 5m follow loop.md for PR #<n>
```

The loop only reads and reports. It never merges, pushes, comments, approves or resolves threads;
the developer acts on what it reports.

## Each tick

1. Read the PR state:

   ```bash
   gh pr view <n> --json state,mergedAt,mergeCommit,mergeable,reviewDecision,statusCheckRollup,headRefOid
   ```

2. Read the comments added since the previous tick: review comments
   (`gh api repos/{owner}/{repo}/pulls/<n>/comments`), reviews (`gh pr view <n> --json reviews`) and
   conversation comments (`gh pr view <n> --json comments`). Compare `created_at` with the time of
   the previous tick.
3. Report **only what changed** since the previous tick:
   - each check whose status changed: pass, fail or pending;
   - new review comments and reviews: author, `file:line`, one-line excerpt. Suggest
     `/triage-review #<n>` when there are unresolved threads;
   - a change in `mergeable` or `reviewDecision`.

   Nothing changed: report nothing (a no-op tick).

## When a check fails

Name the job and show the last 40 lines of the failed step:

```bash
gh run view <run id> --log-failed | tail -n 40
```

Say whether it looks like the code, the test or the infrastructure (a timeout, an install
failure), and suggest the next step. Do not fix it.

## When the PR is merged

1. Find the CI run on the merge commit. The production deploy is its `deploy-production` job, which
   starts only after the check jobs pass:

   ```bash
   gh run list --workflow CI --branch main --commit <mergeCommit sha> --json databaseId,status,conclusion,url
   gh run view <databaseId> --json jobs --jq '.jobs[] | {name, status, conclusion}'
   ```

   - A check job failed: report it with the failing job (as in
     [When a check fails](#when-a-check-fails)) and stop the loop. Nothing is deployed.
   - Cancelled: a later push to `main` replaced it. Report that this merge ships with the next
     deploy, and stop the loop.
   - No run yet: wait for the next tick. Still none 30 minutes after `mergedAt`: report
     `No CI run 30 minutes after the merge` and stop the loop.

2. When `deploy-production` has finished, report its conclusion and the run's URL. It already fails
   unless `GET /api/health` returns 200. If it succeeded, check production:

   ```bash
   curl -sS -o /dev/null -w "%{http_code}" https://snuser-mn.vercel.app/
   ```

   Report the status code. 200 means it is live.

3. Stop the loop.

## When the PR is closed without merging

Report it and stop the loop.
