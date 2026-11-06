---
name: new-feature-scaffold
description: Scaffold the files for a new feature in this repo's conventions - zod schema, MSW handler and repository method, TanStack Query hooks, page, renderRoute() component test and Playwright E2E stub - tests first. Use when asked to scaffold, add or start a new feature, resource or page, after its ticket and branch exist.
tools: Read, Grep, Glob, Edit, Write, Bash, AskUserQuestion
user-invocable: true
disable-model-invocation: true
---

# New feature scaffold

Creates the skeleton for a feature that follows `docs/architecture.md` and `docs/testing.md`, so the
shape is the same every time. It does not create the ticket or the branch (`/start-ticket` does) and
it never commits.

## Usage

```text
/new-feature-scaffold F9 "Archive user"
```

## Before writing anything

1. Refuse on `main` or `master`.
2. Read `docs/SPEC.md` (§3 data model, §4 API, §5 the feature's ACs, §7 out of scope),
   `docs/architecture.md` and `docs/testing.md`. If the feature is out of scope in §7 or has no ACs,
   stop and say so.
3. Read the closest existing feature under `apps/web/src/features/users/` (for example `DeleteUser`) and copy
   its structure, not a generic template.
4. List the files you will create or change and wait for a yes.

## Files, in this order (tests first)

1. **Tests.** `pages/<Name>.test.tsx` using `renderRoute()` and `server.use(...)` (never mock
   TanStack Query or `fetch`), one test per AC, and `tests/e2e/<name>.spec.ts` with a journey stub.
   Run them and confirm they fail for the right reason.
2. **Shared schema.** Add to `schema.ts` or `query.ts`, the one place the form and the mock API both
   import. Never validate on one side only.
3. **Mock API.** A handler in `mocks/handlers.ts` and a method in `mocks/repository.ts`. Do not touch
   the seed users in `packages/shared/src/seed.ts`.
4. **Client and hooks.** `api/client.ts` and `api/hooks.ts`, with keys from `userKeys`, and the right
   invalidation (see the Cache section of `docs/architecture.md`).
5. **Page and route.** Under `pages/`, with labelled inputs, keyboard-operable dialogs, focus
   management and a layout that works at 375 px.

## Rules

- No `any`, enums or parameter properties. Import through `@/`.
- No waiting on fixed timeouts, no CSS assertions in jsdom tests.
- Finish with `/check-all fast` and list what is left for the developer. Do not commit.
