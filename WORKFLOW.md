# Workflow

The team workflow for this repository. It is linked from the README and imported into
[CLAUDE.md](CLAUDE.md), so Claude follows the same rules.

## Pipeline

Each 🚦 is a gate: Claude stops and waits for the developer's approval before going on. The skills
carry the detail; this list is the map.

0. **Intake.** An issue in the Feature format (`/ticket-pack`) or the Bug format (`/bug-report`).
1. **Clarify** (`/start-ticket #n`). Claude reads the issue, the SPEC and the code, then asks the
   open questions one at a time, as multiple choice with a default. Every question left unanswered
   becomes an **assumption** (ID, the default taken, why, the ACs it affects) in the issue's
   _Assumptions_ section. 🚦 The readiness check passes: _what it asks_ fits in one sentence,
   nothing _ambiguous_ is left unrecorded, and the _first step_ is named.
2. **Branch** (`/start-ticket`). `<type>/<n>-<slug>` from `main`. Two tickets in parallel: one
   worktree each (see [Parallel work](#parallel-work)). 🚦 Ask first.
3. **Plan** (plan mode, `code-explorer`). The steps, the files to change and how, the AC → test
   matrix, and the risks. The developer comments until the plan is right. 🚦 Approve the plan.
4. **Implement** (`test-spec-writer`, hooks). Tests first: failing tests for the ACs (for a bug,
   the test that reproduces it), then the code. The format-on-edit hook runs Prettier on every edit.
5. **Self-check** (`/ship`). The [checks](#checks), then a VS Code diff (`code --diff`) per
   changed file with a summary table, then a local `/code-review`. The developer comments and
   Claude fixes. 🚦 OK to commit.
6. **Pull request** (`/ship`, `/pr-description`). Conventional commits, an entry under
   `[Unreleased]` in `CHANGELOG.md`, push, and a PR with `Closes #n` and the assumptions for the
   reviewer to confirm. 🚦 Ask before the commit, the push and the PR.
7. **Walkthrough** (`/pr-walkthrough #pr`). An artifact page that walks a reviewer through the PR,
   linked from the PR. It starts private; the author shares it.
8. **Review** (CI review, `/triage-review #pr`, `/review-checklist`). Each comment is triaged:
   **fix** (change the code), **leave** (reply with the reason) or **ask why** (reply with a
   question). Fixed threads started by a bot are resolved; people resolve their own. Review order:
   correctness → tests → readability → security basics → scope. The CI review runs once, when the
   PR is opened or marked ready (drafts are skipped). For another review after fixes, comment
   `@claude review this PR`.
9. **Watch** (`/loop 5m follow loop.md for PR #<n>`, see [loop.md](loop.md)). While the PR is open:
   CI checks, new review comments, the mergeable state. After the merge: the `Deploy` run
   (GitHub Pages, after CI passes on `main`) and the production URL. It stops by itself.
10. **Merge and clean up.** The developer merges. The issue closes and the worktree is removed.
    Cutting a version: `/release-checklist <x.y.z>` (a release PR, then a `v<x.y.z>` tag).

`@claude` in an issue or PR comment runs Claude in GitHub Actions (`.github/workflows/claude.yml`).

## Rules

1. Start every piece of work from an issue, written with `/ticket-pack`, `/start-ticket` or
   `/bug-report`. The formats live in those skills; there are no issue or PR template files.
2. Branch from `main`, named `<type>/<issue number>-<slug>`. The type is one of the commit types
   in rule 3, and the slug is at most 5 words of lowercase letters and digits joined by `-`:
   `^(feat|fix|docs|test|refactor|perf|ci|build|chore|revert)/[0-9]+-[a-z0-9]+(-[a-z0-9]+){0,4}$`,
   for example `feat/12-add-export`. Never commit to `main` directly. Branches under `claude/` and
   `dependabot/` are exempt (bots create them).
3. Write commits as [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/), header
   `type(scope)!: description`:
   - **type**: `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `ci`, `build`, `chore` or
     `revert`. The scope is optional, and `!` marks a breaking change (a `BREAKING CHANGE:` footer
     is allowed too).
   - **subject**: at most 72 characters for the whole header, imperative mood, the description
     starts with a lowercase letter, one space after the colon, no trailing period.
   - **tags**: an optional SPEC feature and issue number at the end, e.g.
     `feat: add edit user page (F4)` or `chore: tidy hooks (#32)`.
   - **body**: optional, after one blank line. Its line length is not checked.

   Messages git writes itself (`Merge `, `Revert "`, `fixup! `, `squash! `) are not checked.

4. Open a pull request (a merge request on GitLab) that references the issue (`Closes #<n>`), in
   the format of `/pr-description`: what, why, assumptions, how tested, risk, evidence.
5. Before asking for review, run the [checks](#checks).
6. A bug fix starts with a failing test that reproduces the bug.
7. A decision made without an answer is an assumption: write it down in the issue and the PR,
   never leave it implicit.

## Checks

- App: `pnpm lint`, `pnpm typecheck`, `pnpm test:coverage` and `pnpm e2e`.
- `.claude/`: `node --test .claude/hooks/*.test.mjs` (needs `pnpm install` first, because the
  format-on-edit hook tests use Prettier from `node_modules`).

## Parallel work

Work on two tickets at once in separate git worktrees, one branch each. Run `pnpm install` in each
new worktree, and give each worktree its own E2E port: `E2E_PORT=4174 pnpm e2e`. Playwright reuses
a server already listening on its port, so two worktrees on the default 4173 would both test the
first one's build.

## Git hooks

A Husky pre-commit hook (`.husky/pre-commit`) runs the checks on the staged files: lint-staged for
the app and the hook tests when `.claude/` changed. It is installed by `pnpm install`, so run that
once after cloning. Don't skip it with `--no-verify`.

The same Husky setup enforces rules 2 and 3:

- `.husky/pre-commit` refuses a commit while `main` or `master` is checked out.
- `.husky/commit-msg` refuses a message that breaks the commit format of rule 3.
- `.husky/pre-push` refuses a push whose target is `main` or `master`, and a push of a branch whose
  name does not match the rule 2 regex. Tags and branch deletions are not checked, so an old branch
  with a non-matching name can still be deleted.

The checks live in [.claude/hooks/convention.mjs](.claude/hooks/convention.mjs), which
`block-forbidden.mjs` also uses to stop Claude from creating a branch with a bad name. Git runs the
hooks in the checkout or worktree you are working in, so a feature branch (or a worktree on one)
is never blocked.

## GitHub and GitLab

The repository is hosted on both GitHub and GitLab. The skills use `gh`, so issues, PRs and the PR
loop run on GitHub. There are no template files, so an issue or PR started in either web UI opens
blank: write the body with the skills.
