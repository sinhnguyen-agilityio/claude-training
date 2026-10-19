# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

User Management Dashboard: a React 19 + TypeScript (strict) CRUD app for users, built as a
training project. There is no backend. An MSW mock REST API runs in the browser in **every**
build, production included, and persists to `localStorage`. `docs/SPEC.md` is the source of truth
for the data model (§3), the API contract (§4) and the acceptance criteria for features F1–F6
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

A Husky pre-commit hook runs lint-staged (oxlint + Prettier on staged files). Before asking for a
review, run `pnpm lint`, `pnpm typecheck`, `pnpm test:coverage` and `pnpm e2e`.

## Workflow

- Work starts from a GitLab issue (`.gitlab/issue_templates/`: Feature, Bug).
- Branch from `main`: `feat/<issue>-<slug>` or `fix/<issue>-<slug>`. The MR references the issue
  with `Closes #<n>`.
- Bug fixes start with a failing test that reproduces the bug.
- Commit messages use conventional prefixes (`feat:`, `fix:`, `test:`, `chore:`), tagged with the
  SPEC feature where relevant, e.g. `feat: add edit user page ... (F4)`.

## Architecture

Request flow: page → `features/users/api/hooks.ts` (TanStack Query) → `api/client.ts` (`fetch`)
→ MSW handler (`mocks/handlers.ts`) → repository (`mocks/repository.ts`) → `localStorage`.

- **Shared schemas are the contract.** `features/users/schema.ts` (the User Zod schemas) and
  `features/users/query.ts` (list query params) are imported by both the UI and the mock API. The
  form validates with `userCreateSchema` through `zodResolver`, and the MSW handler parses the
  request body with the same schema. The list page parses URL params with `usersQuerySchema`'s
  field schemas, and the handler parses the query string with the whole schema. Change rules in
  those files, never in only one side.
- **The mock API is wired twice from the same factory.** `createHandlers(repository, { delayMs })`
  is used by `mocks/browser.ts` (service worker, 300 ms latency, started in `main.tsx` before
  React renders) and by `mocks/node.ts` (Vitest, no latency). The repository takes injectable
  `storage`, `now` and `generateId` for tests, and reseeds itself when storage is empty or fails
  schema validation. The seed data (`mocks/seed.ts`) is a fixed set of 25 users that tests rely on
  by exact value.
- **Errors:** every non-2xx response becomes an `ApiError` with `status` and `fieldErrors`
  (status 0 means a network failure). `UserForm` maps `fieldErrors` onto form fields with
  `setError` (e.g. a 409 on email) and shows anything else as a root error. Pages pass an
  `onSubmit` that simply throws.
- **Cache:** query keys come from the `userKeys` factory. Create and update write the detail
  cache and invalidate `userKeys.lists()`. Delete invalidates lists, then removes the detail last,
  so an open detail page doesn't flash "User not found". Reset removes the details and resets the
  lists.
- **List state lives in the URL.** `useUsersListParams` reads and writes search, filters, sort and
  page as search params. Default values are left out of the URL, invalid values fall back to the
  defaults, and changing the search, a filter or the sort resets the page. `listLocation.ts`
  remembers the last list query in `sessionStorage`, so detail, edit and delete flows can return to
  the same filtered view.
- **Create and edit share `UserForm`.** Edit enables `requireChanges` (Submit is disabled until a
  value differs) and `guardUnsavedChanges`. The guard (`shared/hooks/useUnsavedChangesGuard.ts`)
  combines a router `useBlocker` with `beforeunload`. Call `allowNavigation()` before navigating on
  purpose, or pass the navigation state `{ discardChanges: true }` to skip the guard.

## Testing

- Component tests render the **real route tree** with `renderRoute(path)` from
  `src/test/renderWithProviders.tsx`, which returns `{ user, router, queryClient }`. They go
  through the MSW node server rather than mocking hooks. Override one endpoint with
  `server.use(http.…)`. Handlers are reset after each test, and `localStorage`/`sessionStorage`
  are cleared before each test, so every test starts from the seed data.
- `asyncUtilTimeout` is raised to 3 s in `src/test/setup.ts` because the 300 ms search debounce
  plus a request can exceed 1 s under a coverage run. Wait on content, never on fixed timeouts.
- jsdom applies no CSS. Check visual behaviour (hover, computed colors, sizes) in Playwright.
  Tailwind v4 computes its palette colors as `oklch(...)`, not hex or rgb.
- E2E runs against the production build (`pnpm build && pnpm preview --port 4173`) and reuses a
  server that is already running. `tests/e2e/accessibility.spec.ts` covers axe checks and the
  375 px layout. SPEC §6 requires an E2E journey for each feature.

## Conventions

- Import through the `@/` alias (→ `src/`). TypeScript is strict with `noUncheckedIndexedAccess`
  and `erasableSyntaxOnly` (no enums or parameter properties), and app code has no `any`.
- Feature code lives in `src/features/users/` (api, components, hooks, pages, plus the schema,
  query and label modules). Reusable UI, hooks and utils live in `src/shared/`.
- Styling is Tailwind v4 (`@import 'tailwindcss'` in `index.css`, no config file). `Button`
  joins its variant classes and `className` without resolving conflicts, so a variant's color or
  hover classes can silently beat the caller's.
- Requirements: accessible (labelled inputs, keyboard-operable dialogs, focus management) and
  responsive down to 375 px.

## Never do

- Never create a branch, commit or push without asking first, and never commit to `main`
  directly. All changes reach `main` through a merge request.
- Never skip the pre-commit hook (`--no-verify`), and never lower the 80% coverage threshold to
  get a run passing.
- Never change validation rules on only one side. Edit `schema.ts` / `query.ts`, which both the
  form and the mock API use.
- Never change the existing seed users in `mocks/seed.ts` casually. Unit and E2E tests rely on
  their exact values.
- Never disable or bypass MSW in production builds. It is the only API (SPEC §2).
- Never mock TanStack Query hooks or `fetch` in component tests. Render the route with
  `renderRoute()` and override endpoints with `server.use(...)`.
- Never wait on fixed timeouts in tests (`setTimeout`, `waitForTimeout`). Wait for content to
  appear.
- Never assert CSS behaviour (hover, colors, sizes) in jsdom unit tests alone. Verify it in
  Playwright.
- Never use `any`, enums or parameter properties in app code (strict TS, `erasableSyntaxOnly`).
- Never add features listed as out of scope in SPEC §7 (auth, a real backend, bulk actions,
  import/export, i18n, avatars) without an issue that changes the spec.
