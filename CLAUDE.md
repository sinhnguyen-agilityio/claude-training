# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

User Management Dashboard: a React 19 + TypeScript (strict) CRUD app for users, built as a
training project. There is no backend. An MSW mock REST API runs in the browser in **every**
build, production included, and persists to `localStorage`. `docs/SPEC.md` is the source of truth
for the data model (§3), the API contract (§4) and the acceptance criteria for features F1–F8
(§5). Code comments cite it as `SPEC F4`, `SPEC §4` and so on.

## Commands

Node 22+, pnpm (the version is pinned in `package.json`; `corepack enable` installs it).

```bash
pnpm dev                 # dev server on http://localhost:5173
pnpm build               # tsc -b + vite build
pnpm typecheck           # tsc -b
pnpm lint                # oxlint --deny-warnings
pnpm format              # prettier --write .   (format:check to verify)
pnpm test                # vitest run (unit/component, jsdom)
pnpm test:coverage       # enforces an 80% threshold on lines/statements/functions/branches
pnpm e2e                 # Playwright: builds, serves the production build on :4173, runs tests/e2e

# Single tests
pnpm vitest run src/features/users/pages/DeleteUser.test.tsx
pnpm vitest run -t "part of the test name"
pnpm exec playwright test tests/e2e/delete-user.spec.ts
pnpm exec playwright install chromium   # once, before the first E2E run
```

A Husky pre-commit hook runs lint-staged (oxlint + Prettier on staged files). The pre-review checks
are in the Workflow section below.

## Workflow

The team workflow is followed for every change:

@WORKFLOW.md

## Architecture and testing

Read these on demand, not for every task:

- [docs/architecture.md](docs/architecture.md): request flow, shared schemas, the mock API, cache keys,
  list state in the URL, create and edit forms.
- [docs/testing.md](docs/testing.md): `renderRoute()`, the MSW node server, timeouts, jsdom limits, E2E.

## Conventions

- Import through the `@/` alias (→ `src/`). TypeScript is strict with `noUncheckedIndexedAccess`
  and `erasableSyntaxOnly`.
- Feature code lives in `src/features/users/` (api, components, hooks, pages, plus the schema,
  query and label modules). Reusable UI, hooks and utils live in `src/shared/`.
- Styling is Tailwind v4 (`@import 'tailwindcss'` in `index.css`, no config file). `Button`
  joins its variant classes and `className` without resolving conflicts, so a variant's color or
  hover classes can silently beat the caller's.
- Requirements: accessible (labelled inputs, keyboard-operable dialogs, focus management) and
  responsive down to 375 px.

## Never do

- Never create a branch, commit or push without asking first, and never commit to `main`
  directly. All changes reach `main` through a pull request.
- Never skip the pre-commit hook (`--no-verify`), and never lower the 80% coverage threshold to
  get a run passing.
- Never change validation rules on only one side. Edit `schema.ts` / `query.ts`, which both the
  form and the mock API import.
- Never change the existing seed users in `mocks/seed.ts` casually. Unit and E2E tests rely on
  their exact values.
- Never stop the MSW worker from starting in production builds (e.g. by gating it on
  `import.meta.env.DEV`). It is the only API (SPEC §2). MSW's own `'bypass'` options, such as
  `onUnhandledFrame: 'bypass'` in `mocks/browser.ts`, are intended.
- Never mock TanStack Query hooks or `fetch` in tests. Network goes through the MSW node server,
  overridden with `server.use(...)`. Tests of pages and routes render the real route tree with
  `renderRoute()`. Shared UI components and hooks, which have no route, may be rendered directly.
- Never wait on real fixed timeouts in tests (`setTimeout` sleeps, Playwright `waitForTimeout`).
  Wait for content to appear. For time-based behaviour with no content to wait for (e.g. toast
  auto-dismiss), use `vi.useFakeTimers()` and `vi.advanceTimersByTime()`.
- Never assert CSS in jsdom tests, including Tailwind class names (`toHaveClass`, `className`).
  jsdom applies no CSS, so check visual behaviour (hover, computed colors, sizes) only in
  Playwright.
- Never put a "Generated with Claude Code" or co-author line in MR/PR descriptions.
- Never use `any`, enums or parameter properties in app code.
- Never add features listed as out of scope in SPEC §7 (auth, a real backend, selecting users
  across pages, import, i18n, avatars; CSV export is F8) without an issue that changes the spec.
