# Architecture

How the app is wired. Read this before changing the API layer, the cache, list state or the forms.

> The request flow below is the current state: the browser runs the MSW mock. Epic #31 replaces
> it with an Express + PostgreSQL API, and #46 rewrites this page.

Request flow: page → `features/users/api/hooks.ts` (TanStack Query) → `api/client.ts` (`fetch`)
→ MSW handler (`mocks/handlers.ts`) → repository (`mocks/repository.ts`) → `localStorage`.

- **Shared schemas are the contract.** `packages/shared/src/schema.ts` (the User Zod schemas) and
  `packages/shared/src/query.ts` (list query params), exported as `@app/shared`, are imported by both the UI and the mock API. The
  form validates with `userCreateSchema` through `zodResolver`, and the MSW handler parses the
  request body with the same schema. The list page parses URL params with `usersQuerySchema`'s
  field schemas, and the handler parses the query string with the whole schema.
- **The mock API is wired twice from the same factory.** `createHandlers(repository, { delayMs })`
  is used by `mocks/browser.ts` (service worker, 300 ms latency, started in `main.tsx` before
  React renders) and by `mocks/node.ts` (Vitest, no latency). The repository takes injectable
  `storage`, `now` and `generateId` for tests, and reseeds itself when storage is empty or fails
  schema validation. The seed data (`packages/shared/src/seed.ts`) is a fixed set of 25 users.
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

## API structure

`apps/api/src` is split by layer. A feature ticket adds a router, a controller and a service, and
touches nothing else:

- `routes/`: one Express router per feature; `routes/index.ts` (`createApiRouter`) lists them and
  keeps the 404 last. `createApp` mounts the result under `/api`. A router that stores data is a
  function of the database, `createUsersRouter(db)`, and `createApiRouter` mounts it only when
  `createApp({ db })` got one. `server.ts` always passes the real `db`; a test of an unrelated
  route can leave it out and needs no Postgres.
- `controllers/`: read the validated request, call a service, send the response. Like the router,
  `createUsersController(db)` closes over the database it is given.
- `services/`: the business logic and the database access. They take the `db` as their first
  argument (`listUsers(db, query)`), so a test can pass the schema of `createTestDb()`.
  `GET /api/users` counts first, then reads the page; a page past the end answers `data: []`
  without the second query. Names are sorted on `lower()`, so letter case does not change the order
  (punctuation and accents still follow the database collation), and every sort ends on the id, so
  paging never repeats a user. `q` is escaped with `utils/escapeLike.ts` (`%`, `_` and `\` are
  literal), and the shared schema rejects a NUL byte in it with a 400.
  `GET /api/users/:id` has no `validate()`, because a bad id is a 404, not a 400 (SPEC §4):
  `getUser` returns `null` for an id that does not pass `utils/isUuid.ts`, without a query, since the
  `uuid` column would raise an error for it. `routes/users.ts` registers `/:id` last, so a fixed path
  such as `/export` has to be added above it.
- `db/`: `schema.ts` (the Drizzle `users` table and its enums), `client.ts` (`db` and a `pg` pool of
  at most 5 connections), `migrate.ts` and `seed.ts` (the functions, plus thin `*.cli.ts` entries
  for `pnpm db:migrate` and `pnpm db:seed`), `mappers.ts` (`toUser`: a row to the shared `User`,
  dates as ISO strings) and `types.ts` (`Database`, so tests can pass their own). The generated SQL
  is in `apps/api/drizzle/`: change `schema.ts`, run `pnpm db:generate` and commit the result.
- `middlewares/`: `requestLogger`, `validate`, `notFound` and `errorHandler`.
- `utils/`: `asyncHandler` (forwards an error from an async controller to `errorHandler`) and the
  `Logger` type with `silentLogger` and `stdLogger`.
- `constants/`: `HTTP_STATUS`, the page sizes (re-exported from `@app/shared`) and the bulk limits.
- `config/env.ts`: `loadEnv()` parses `PORT`, `DATABASE_URL` (required), `ALLOW_RESET` and `NODE_ENV`
  with Zod. An invalid or missing value exits with code 1 and names the variable, never its value.

Order in `createApp`: `requestLogger`, `express.json()`, the `/api` router, `errorHandler`. Error
bodies follow SPEC §4, `{ message, fieldErrors? }`: unknown route 404 `Not found`, a body that is not
JSON 400 `Invalid JSON`, any other client error body-parser raises keeps its 4xx status (413 `Payload too large`, otherwise `Bad request`), anything unexpected 500 `Internal server error` (logged with
`logger.error`, never sent to the client).

- **`validate({ body, query, params })`** answers 400 `Validation failed` with the first message per
  field (nested paths joined with dots, an error on the whole value under `_`). The parsed values are
  on `req.validated`, not `req.query`, which is read-only in Express 5.
- **One log line per request**, also when the client hangs up first: `METHOD /path status 12ms`. The query string and the body are never
  logged.
- **Tests** call `createApp({ logger, extraRouter, db })`: a recording logger to read the log, the
  database of `createTestDb()` for a route that stores data, and an extra router for a route that does not exist in the API (one that throws, for example).
