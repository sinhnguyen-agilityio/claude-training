# Architecture

How the app is wired. Read this before changing the API layer, the cache, list state or the forms.

Request flow: page → `features/users/api/hooks.ts` (TanStack Query) → `api/client.ts` (`fetch`)
→ MSW handler (`mocks/handlers.ts`) → repository (`mocks/repository.ts`) → `localStorage`.

- **Shared schemas are the contract.** `features/users/schema.ts` (the User Zod schemas) and
  `features/users/query.ts` (list query params) are imported by both the UI and the mock API. The
  form validates with `userCreateSchema` through `zodResolver`, and the MSW handler parses the
  request body with the same schema. The list page parses URL params with `usersQuerySchema`'s
  field schemas, and the handler parses the query string with the whole schema.
- **The mock API is wired twice from the same factory.** `createHandlers(repository, { delayMs })`
  is used by `mocks/browser.ts` (service worker, 300 ms latency, started in `main.tsx` before
  React renders) and by `mocks/node.ts` (Vitest, no latency). The repository takes injectable
  `storage`, `now` and `generateId` for tests, and reseeds itself when storage is empty or fails
  schema validation. The seed data (`mocks/seed.ts`) is a fixed set of 25 users.
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
