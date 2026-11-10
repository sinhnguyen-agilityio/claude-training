# Changelog

All notable changes to this project are listed here, newest first. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Longer notes for a feature are in
[docs/releases/](docs/releases/).

## [Unreleased]

### Added

- `POST /api/reset`: put the 25 seed users back in PostgreSQL (the same code as `pnpm db:seed`, in
  one transaction, so a failed insert leaves the rows untouched); answers 204 with an empty body
  and ignores any request body. The route exists only when `ALLOW_RESET=true`; otherwise it answers
  the usual 404 `Not found`. `ALLOW_RESET` is documented in `.env.example` (#43).
- `DELETE /api/users/:id`: remove a user from PostgreSQL; answers 204 with an empty body, and 404
  `User not found` for an unknown, already deleted or non-UUID id (an uppercase UUID matches the
  user). Only the row of that id is removed (#42).
- `PATCH /api/users/:id`: change any subset of a user's fields in PostgreSQL, parsed with the shared
  `userUpdateSchema`; answers 200 with the full user and a new `updatedAt` (`createdAt` and `id`
  stay). The body is validated before the user is looked up, so an invalid body is a 400 even for an
  unknown id. An empty body, or one that holds only ignored keys (`id`, `createdAt`, `updatedAt`),
  answers 400 `Nothing to update`; an unknown or non-UUID id answers 404 `User not found`; an email
  another user has (any letter case) answers the same 409 as `POST`, while a user's own email is not
  a conflict (#41).
- `POST /api/users`: create a user in PostgreSQL, parsed with the shared `userCreateSchema` (names
  trimmed, email lowercased, a blank phone stored as `null`, `status` `active` by default; `id` and
  the timestamps in the body are ignored). Answers 201 with the user, 400 `Validation failed` with
  one entry per bad field, and 409 `Email is already in use` for an email that exists in any letter
  case. The unique index on `lower(email)` decides, so of two simultaneous requests exactly one
  succeeds (#40).
- `GET /api/users/:id`: one user from PostgreSQL, as the shared `User` (ISO dates, `phone` `null` or
  a string). An unknown id answers 404 `{ "message": "User not found" }`, and so does an id that is
  not a UUID (checked before the query, which the `uuid` column would answer with a 500) (#39).
- `GET /api/users`: list, search, filter, sort and page the users from PostgreSQL, parsed with the
  shared `usersQuerySchema`. `q` matches first name, last name or email separately and without
  regard to case (`%`, `_` and `\` are literal); names sort without regard to case, then by id; a
  page past the end answers 200 with no users; a bad query answers 400 `Validation failed`.
  `createApp` takes the database as `createApp({ db })` (#38).
- The database layer of the API: the Drizzle `users` table (enum `role` and `status`, a unique
  index on `lower(email)`), the first SQL migration in `apps/api/drizzle`, a `db` client on a `pg`
  pool of at most 5 connections, `toUser()` (row to the shared `User`), and the scripts
  `pnpm db:generate`, `pnpm db:migrate` and `pnpm db:seed` (the last one replaces the rows with the
  25 seed users in one transaction). `createTestDb()` gives each API test file its own Postgres
  schema, and the CI `app` job has a `postgres:16` service for it (#37).
- `docker-compose.yml` with a `db` service (Postgres 16, healthcheck, named volume `pgdata`),
  `.env.example`, and the scripts `pnpm db:up`, `pnpm db:down` and `pnpm db:destroy` (#36).
- API structure: the layer folders under `apps/api/src`, `loadEnv()` for `PORT`, `DATABASE_URL`,
  `ALLOW_RESET` and `NODE_ENV`, JSON errors for an unknown route (404), invalid JSON (400) and
  unexpected errors (500), `validate()`, `asyncHandler`, the shared constants and one log line per
  request (#35).
- `apps/api`: an Express 5 package with `createApp()`, a `listen` entry on `PORT` (default 3001)
  and `GET /api/health`, tested with supertest. `pnpm api:dev` starts it, and `pnpm test` and
  `pnpm test:coverage` now run the API tests too (#34).
- Commit message and branch name convention, written in `WORKFLOW.md` rules 2 and 3 and enforced
  by the `.husky/commit-msg` hook, `.husky/pre-push` and `block-forbidden.mjs`, which share
  `.claude/hooks/convention.mjs` (#51).
- Claude Code hooks `protect-files` (blocks edits to `pnpm-lock.yaml`, the seed users and the
  coverage thresholds) and `typecheck-on-edit` (runs `tsc -b` after a `.ts`/`.tsx` edit), the
  skills `check-all` and `new-feature-scaffold`, and a `.mcp.json` with the context7 MCP server.
- Workflow skills `start-ticket`, `ship`, `pr-walkthrough` and `triage-review`, and `loop.md` for
  watching an open PR with `/loop` (#22).
- `skills.test.mjs`: checks every skill's frontmatter, its README row, and the headings of the
  issue and PR formats (#22).
- Deploy to GitHub Pages after CI passes on `main` (`.github/workflows/deploy.yml`). The app is
  live at <https://sinhnguyen-agilityio.github.io/claude-training/> (#23).
- `E2E_PORT` sets the E2E port, so two worktrees can run E2E at once; `BASE_PATH` sets the build's
  base path (#23).
- A smoke E2E (`tests/e2e/subpath.spec.ts`) on a `BASE_PATH=/claude-training/` build, run in CI
  after `pnpm e2e`, so a base-path bug in the build, the router or the mock service worker fails
  the PR before it reaches GitHub Pages (#26).

### Changed

- `DATABASE_URL` is now required by the API: `pnpm api:dev` and `pnpm start` read it from `.env`
  at the repo root (copy `.env.example`), and the process exits naming the variable when it is
  missing (#37).
- The repo is a pnpm workspace: the app moved to `apps/web`, and the User schemas, the list query
  schema and the 25 seed users moved to `packages/shared` (`@app/shared`), so the API can import
  them. Root scripts, CI, deploy and the Claude hooks use the new paths; no behaviour change (#33).
- SPEC §1, §2, §4 and §7, CLAUDE.md and the docs now describe the Express + PostgreSQL API that replaces
  the MSW mock (epic #31). The code still runs the mock until #46 (#32).
- `pr-walkthrough` shows each file's diff on the page, and the context7 MCP server is pinned to an exact version.
- `pr-description`: How tested is now manual steps a reviewer can follow (setup, steps with expected results, edge cases) instead of a table of passed commands.
- Fixes to the workflow skills found while running #26: `triage-review` also reads conversation
  comments and reviews (the CI review is one), `start-ticket` skips the questions for an issue that
  has none open, `ship` reports a check that fails once and then passes as possibly flaky,
  `pr-walkthrough` shows the head commit and asks for a rerun after new commits, and
  `review-checklist` and `pr-description` match `WORKFLOW.md` (#28).
- Commit messages carry no `Co-Authored-By` or "Generated with Claude Code" line, like PR
  descriptions (#28).
- The issue (Feature, Bug) and PR formats live in the `ticket-pack`, `bug-report` and
  `pr-description` skills. They add Assumptions and Definition of done, and the PR format adds
  Assumptions, an AC → test table and Risk. `ticket-pack` runs a readiness check (#22).
- `WORKFLOW.md` describes the full pipeline from issue to merge, and branches may also start with
  `chore/` or `docs/` (#22).
- The Claude Code review in CI runs once per PR, when it is opened or marked ready, and skips
  drafts. Ask for another with an `@claude review this PR` comment (#24).
- `release-checklist` is written for this repo: CHANGELOG, release notes, version and a `vX.Y.Z`
  tag, released through a PR (#24).

### Removed

- The issue and PR/MR template files in `.github/` and `.gitlab/`, and `templates.test.mjs` (#22).

## [1.0.0] - 2026-10-30

### Added

- Bulk actions on the users list: select rows, then delete or set status in one step (F7).
  See [docs/releases/f7-bulk-actions.md](docs/releases/f7-bulk-actions.md).
- Export the users list to a CSV file (F8).
  See [docs/releases/f8-export-users-csv.md](docs/releases/f8-export-users-csv.md).
- Skills `ticket-pack`, `bug-report` and `pr-description`, and subagents `code-explorer` and
  `test-spec-writer`.
- Pull request and merge request templates, and issue templates for both GitHub and GitLab.
- Security checks in CI (`pnpm audit`) and Dependabot updates.

### Changed

- The app now lives at the repository root instead of `user-management/`.
- The Prettier hook is now `format-on-edit` and formats files across the repository.
- Claude Code guidance is split: `CLAUDE.md` holds the rules; architecture and testing notes are in
  `docs/`.

### Removed

- The `mcp/` demo and the `how-we-write-migrations` skill.

[1.0.0]: https://github.com/sinhnguyen-agilityio/claude-training/tree/v.1.0.0
