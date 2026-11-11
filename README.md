# User Management Dashboard

A small React + TypeScript CRUD app for managing users. It is also a training repository for
learning to build software with [Claude Code](https://claude.com/claude-code): the app is the
subject, and the Claude Code configuration (hooks, skills, subagents) is what the training is
about. The backend is an Express + PostgreSQL API (epic #31); the app calls it through a `/api`
proxy in every environment.

The full spec and acceptance criteria are in [docs/SPEC.md](docs/SPEC.md).

**Live demo:** <https://sinhnguyen-agilityio.github.io/claude-training/>. It shows the latest `main`
and is deployed after CI passes. **The demo is broken for now:** the app no longer ships a mock
API and the static site has no backend. It works again when the deploy ticket of epic #31 lands.

## Tech stack

React 19 · TypeScript (strict) · Vite · React Router · TanStack Query · React Hook Form + Zod ·
Tailwind CSS · Vitest + Testing Library + MSW (tests only) · Playwright · oxlint + Prettier

## Training goals

- Work the way a team would: issue → branch → pull request → review.
- Drive a feature from a written spec ([docs/SPEC.md](docs/SPEC.md)) with clear acceptance
  criteria.
- Write tests first for bugs, and keep unit, component and E2E coverage healthy (80% threshold).
- Teach Claude Code the project's rules through `CLAUDE.md`, hooks, skills and subagents instead of
  repeating them in every prompt.

## Run it from scratch

Prerequisites: **Node.js 22.9+** and **pnpm**. Run `corepack enable` to install the pinned pnpm
version (on Node 25+, which no longer bundles Corepack, run `npm i -g corepack` first).

```bash
git clone https://github.com/sinhnguyen-agilityio/claude-training.git claude
cd claude
pnpm install   # also installs the Husky git hooks
cp .env.example .env
pnpm db:up        # Postgres in Docker
pnpm db:migrate
pnpm db:seed      # the 25 users
pnpm api:dev      # API on :3001, leave it running
pnpm dev          # in a second terminal
```

Open <http://localhost:5173>; `/api` is proxied to the API (set `API_PROXY_TARGET` to use another
one). `pnpm e2e` starts its own API and **resets the database it points at before every test**, so it
refuses to run without `E2E_DATABASE_URL`, a separate migrated and seeded database:
`E2E_DATABASE_URL=postgres://app:app@localhost:5432/users_e2e pnpm e2e` (see
[docs/testing.md](docs/testing.md)). For E2E tests, install the browser once:

```bash
pnpm --filter @app/web exec playwright install chromium
```

## API

`apps/api` is an Express 5 app (TypeScript, run with `tsx`). For now it answers the health check
and `GET /api/users` and `GET /api/users/:id`. The browser app calls it through the `/api` proxy. The API needs
`DATABASE_URL` (see [Local database](#local-database)) and reads it from `.env` at the repo root.

```bash
pnpm api:dev                      # listens on PORT (default 3001): "API listening on :3001"
curl localhost:3001/api/health    # {"status":"ok"}
curl "localhost:3001/api/users?q=lee&role=admin&sort=name&order=asc&page=1&pageSize=10"
                                  # { data, total, page, pageSize } (needs db:migrate and db:seed)
curl localhost:3001/api/users/00000000-0000-4000-8000-000000000001
                                  # one user; 404 {"message":"User not found"} for an unknown id,
                                  # and the same 404 for an id that is not a UUID
pnpm test                         # runs the web and the API tests
```

## Local database

Prerequisite: **Docker Desktop** (running). Compose starts only Postgres 16; the API runs on the
host with `pnpm api:dev`. The data lives in the named volume `pgdata`.

```bash
cp .env.example .env   # once; the defaults work as they are
pnpm db:up             # docker compose up -d --wait db (returns once it is healthy)
pnpm db:down           # stop the container, keep the data
pnpm db:destroy        # stop the container and delete the data (down -v)
pnpm db:migrate        # create or update the tables (safe to run again)
pnpm db:seed           # replace the users with the 25 seed users (safe to run again)
pnpm db:generate       # after editing apps/api/src/db/schema.ts: write a new SQL migration
```

The tables are defined with Drizzle in `apps/api/src/db/schema.ts`, and the generated migrations
are in `apps/api/drizzle/`. Commit a new migration with the schema change that caused it. The API
tests use this database too, each test file in a schema of its own, so start it with `pnpm db:up`
before `pnpm test`.

The connection string is `DATABASE_URL` in `.env.example`
(`postgres://app:app@localhost:5432/users_dev`). If port 5432 is taken, set `DB_PORT=5433` in
`.env` and use that port in `DATABASE_URL`. The port is published on `127.0.0.1` only.

`POSTGRES_USER`, `POSTGRES_PASSWORD` and `POSTGRES_DB` apply only when the volume is first
created. After changing them in `.env`, run `pnpm db:destroy` and then `pnpm db:up`.

## Deploy

[.github/workflows/deploy.yml](.github/workflows/deploy.yml) publishes `main` to GitHub Pages
after the CI workflow passes on it (or when run by hand from the Actions tab). Pages serves the app
under `/claude-training/`, so that workflow builds with `BASE_PATH=/claude-training/`. Every other
build, E2E included, uses `/`. To try the Pages build locally:

```bash
BASE_PATH=/claude-training/ pnpm build
BASE_PATH=/claude-training/ pnpm preview   # http://localhost:4173/claude-training/
```

In Git Bash on Windows, prefix both with `MSYS_NO_PATHCONV=1`. Otherwise Git Bash rewrites
`/claude-training/` into a Windows path.

Setting it up once: **Settings → Pages → Source: GitHub Actions**.

## Scripts

| Command              | What it does                                  |
| -------------------- | --------------------------------------------- |
| `pnpm dev`           | Start the dev server                          |
| `pnpm api:dev`       | Start the API (Express) on port 3001          |
| `pnpm db:up`         | Start the local Postgres (Docker)             |
| `pnpm db:down`       | Stop it, keep the data                        |
| `pnpm db:destroy`    | Stop it and delete the data                   |
| `pnpm db:generate`   | Write a SQL migration from the Drizzle schema |
| `pnpm db:migrate`    | Apply the migrations                          |
| `pnpm db:seed`       | Replace the users with the 25 seed users      |
| `pnpm build`         | Type-check and build for production           |
| `pnpm preview`       | Serve the production build                    |
| `pnpm typecheck`     | Run the TypeScript compiler                   |
| `pnpm lint`          | Lint with oxlint                              |
| `pnpm format`        | Format with Prettier                          |
| `pnpm test`          | Run the web and API tests once                |
| `pnpm test:watch`    | Run tests in watch mode                       |
| `pnpm test:coverage` | Run tests with a coverage report              |
| `pnpm e2e`           | Build, serve and run the Playwright E2E tests |

## Working with Claude Code

Run `claude` from the repository root. It picks up the configuration below automatically.

### Project instructions

- [CLAUDE.md](CLAUDE.md): commands, conventions and the "never do" list. It imports
  [WORKFLOW.md](WORKFLOW.md).
- [docs/architecture.md](docs/architecture.md) and [docs/testing.md](docs/testing.md): read on
  demand, not loaded into every session.

### Hooks

Configured in [.claude/settings.json](.claude/settings.json), with scripts in [.claude/hooks/](.claude/hooks/):

| Hook                                                         | Event         | What it does                                                                                                                                              |
| ------------------------------------------------------------ | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [block-forbidden.mjs](.claude/hooks/block-forbidden.mjs)     | `PreToolUse`  | Blocks risky git commands run through Bash/PowerShell (force push, hard reset, work on protected branches, a new branch whose name breaks the convention) |
| [protect-files.mjs](.claude/hooks/protect-files.mjs)         | `PreToolUse`  | Blocks edits to `pnpm-lock.yaml`, `packages/shared/src/seed.ts` and the coverage `thresholds` in `apps/web/vite.config.ts`                                |
| [format-on-edit.mjs](.claude/hooks/format-on-edit.mjs)       | `PostToolUse` | Runs Prettier on files Claude edits or writes                                                                                                             |
| [typecheck-on-edit.mjs](.claude/hooks/typecheck-on-edit.mjs) | `PostToolUse` | Runs `tsc -b` after a `.ts`/`.tsx` edit and feeds type errors back to Claude                                                                              |
| [notify-on-finish.mjs](.claude/hooks/notify-on-finish.mjs)   | `Stop`        | Shows a Windows toast and plays a sound when Claude finishes a turn                                                                                       |

If a `PreToolUse` script cannot be loaded, the hook blocks the call (fails closed); the others only
report an error.

The Husky git hooks in [.husky/](.husky/) apply to everyone, not only to Claude:

| Git hook     | What it does                                                                                         |
| ------------ | ---------------------------------------------------------------------------------------------------- |
| `pre-commit` | Refuses commits on `main`/`master`; runs lint-staged, and the hook tests when `.claude/` changed     |
| `commit-msg` | Refuses a commit message that breaks `type(scope)!: description` ([WORKFLOW.md](WORKFLOW.md) rule 3) |
| `pre-push`   | Refuses a push to `main`/`master` and a branch name that is not `<type>/<n>-<slug>` (rule 2)         |

The commit and branch rules are in [convention.mjs](.claude/hooks/convention.mjs), shared with `block-forbidden.mjs`.

### Skills

Defined in [.claude/skills/](.claude/skills/). Each one is also a slash command. The issue and PR
formats live in `ticket-pack`, `bug-report` and `pr-description`; there are no template files. The
order they run in is in [WORKFLOW.md](WORKFLOW.md).

| Skill                                                                | Use it to                                                                                          |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| [ticket-pack](.claude/skills/ticket-pack/SKILL.md)                   | Turn a requirement into a ticket pack; owns the Feature format (`/ticket-pack`)                    |
| [bug-report](.claude/skills/bug-report/SKILL.md)                     | Turn a rough description into a bug report; owns the Bug format (`/bug-report`)                    |
| [start-ticket](.claude/skills/start-ticket/SKILL.md)                 | Clarify an issue, record assumptions, branch and plan it (`/start-ticket #12`)                     |
| [ship](.claude/skills/ship/SKILL.md)                                 | Run the checks, show the diffs, review, commit, push and open the PR (`/ship`)                     |
| [pr-description](.claude/skills/pr-description/SKILL.md)             | Draft a PR/MR description; owns the PR format (`/pr-description`)                                  |
| [pr-walkthrough](.claude/skills/pr-walkthrough/SKILL.md)             | Publish a reviewer walkthrough page for a PR (`/pr-walkthrough #31`)                               |
| [triage-review](.claude/skills/triage-review/SKILL.md)               | Answer review comments with fix, leave or ask why (`/triage-review #31`)                           |
| [review-checklist](.claude/skills/review-checklist/SKILL.md)         | Review a PR or branch (`/review-checklist 2`)                                                      |
| [release-checklist](.claude/skills/release-checklist/SKILL.md)       | Check main, then open the release PR and tag the version (`/release-checklist 1.1.0`)              |
| [check-all](.claude/skills/check-all/SKILL.md)                       | Run lint, typecheck, coverage tests and E2E and report what is red (`/check-all`)                  |
| [new-feature-scaffold](.claude/skills/new-feature-scaffold/SKILL.md) | Scaffold schema, mock API, hooks, page and tests for a feature (`/new-feature-scaffold F9 "Name"`) |

[loop.md](loop.md) is the prompt for watching an open PR: `/loop 5m follow loop.md for PR #<n>`.

### Subagents

Defined in [.claude/agents/](.claude/agents/):

| Subagent                                               | Use it to                                                        |
| ------------------------------------------------------ | ---------------------------------------------------------------- |
| [code-explorer](.claude/agents/code-explorer.md)       | Explore an unfamiliar area without filling the main session      |
| [test-spec-writer](.claude/agents/test-spec-writer.md) | Turn acceptance criteria into a test matrix and Playwright specs |

### MCP servers

Configured in [.mcp.json](.mcp.json), shared with the team:

- **context7**: live documentation for React 19, TanStack Query v5, React Router 8, Zod 4, MSW 3 and
  Vitest 5. Approve it once when Claude Code asks. The config uses `cmd /c npx` for Windows; on
  macOS or Linux, use `npx` directly.
- **Playwright**: not in `.mcp.json`; use the Playwright plugin (`plugin:playwright`) to drive the
  running app and check hover, colors and layout, which jsdom cannot.

### Hook and skill tests

```bash
node --test .claude/hooks/*.test.mjs   # needs `pnpm install` first
```

## Workflow

Issue, branch naming, commit prefixes, pull request, pre-review checks and test-first bug fixes
are defined in [WORKFLOW.md](WORKFLOW.md), together with the Husky hooks that enforce them. The
change history is in [CHANGELOG.md](CHANGELOG.md); longer notes per feature are in
[docs/releases/](docs/releases/).

## Repository layout

```text
.
├── .claude/          # Claude Code settings, hooks, skills and subagents
├── .github/          # CI and Claude workflows, CODEOWNERS
├── .husky/           # Git hooks: pre-commit, commit-msg and pre-push
├── docs/             # SPEC.md, architecture, testing, release notes
├── apps/web/         # The React app: src (app, features, mocks (Vitest only), shared, test), public, tests/e2e
├── apps/api/         # The Express API: src/app.ts (createApp), src/server.ts (listen)
├── packages/shared/  # @app/shared: User schemas, list query schema, the 25 seed users
├── CHANGELOG.md
├── CLAUDE.md
├── loop.md           # /loop prompt for watching an open PR
└── WORKFLOW.md
```
