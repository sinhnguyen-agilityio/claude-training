# User Management Dashboard

A small React + TypeScript CRUD app for managing users. It's a training project: there's no
backend, and data comes from a mock REST API ([MSW](https://mswjs.io)) persisted in
`localStorage`.

The full spec and acceptance criteria are in [docs/SPEC.md](docs/SPEC.md).

## Tech stack

React 19 · TypeScript (strict) · Vite · React Router · TanStack Query · React Hook Form + Zod ·
Tailwind CSS · MSW · Vitest + Testing Library · Playwright · oxlint + Prettier

## Run it from scratch

Prerequisites: **Node.js 22+** and **pnpm** (`corepack enable` installs the version pinned in
`package.json`).

```bash
git clone git@gitlab.asoft-python.com:sinh.nguyen/claude.git
cd claude
pnpm install
pnpm dev
```

Then open http://localhost:5173.

For E2E tests, install the browser once:

```bash
pnpm exec playwright install chromium
```

## Scripts

| Command              | What it does                                  |
| -------------------- | --------------------------------------------- |
| `pnpm dev`           | Start the dev server                          |
| `pnpm build`         | Type-check and build for production           |
| `pnpm preview`       | Serve the production build                    |
| `pnpm typecheck`     | Run the TypeScript compiler                   |
| `pnpm lint`          | Lint with oxlint                              |
| `pnpm format`        | Format with Prettier                          |
| `pnpm test`          | Run unit/component tests once                 |
| `pnpm test:watch`    | Run tests in watch mode                       |
| `pnpm test:coverage` | Run tests with a coverage report              |
| `pnpm e2e`           | Build, serve and run the Playwright E2E tests |

A pre-commit hook (Husky + lint-staged) lints and formats staged files.

## Project structure

```
src/
  app/              # App shell: providers, routes, layout
  features/users/   # Everything for the users feature (api, components, pages, schema)
  mocks/            # MSW handlers, localStorage repository, seed data
  shared/           # Reusable UI, hooks and utilities
  test/             # Test setup and helpers
tests/e2e/          # Playwright specs
docs/               # Spec and decisions
.gitlab/            # Issue templates (Feature, Bug)
```

## Workflow

1. Every piece of work starts as a GitLab issue (use the **Feature** or **Bug** template).
2. Branch from `main`: `feat/<issue>-<slug>` or `fix/<issue>-<slug>`.
3. Open a merge request that references the issue (`Closes #<n>`). Run `pnpm lint`, `pnpm typecheck`, `pnpm test:coverage` and `pnpm e2e` before asking for review.
4. Bug fixes start with a failing test that reproduces the bug.
