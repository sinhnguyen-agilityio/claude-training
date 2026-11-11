// Reads the environment of an E2E run. Kept out of playwright.config.ts so Vitest can test it.
export type E2eEnv = { port: number; apiPort: number; databaseUrl: string }

export function resolveE2eEnv(env: NodeJS.ProcessEnv): E2eEnv {
  // POST /api/reset deletes every user in the database the API points at, so there is no default
  // and no fallback to DATABASE_URL: a run must name a database made for E2E.
  const databaseUrl = env.E2E_DATABASE_URL?.trim()
  if (!databaseUrl) {
    throw new Error(
      'E2E_DATABASE_URL is not set. `pnpm e2e` resets the database it points at before every test, ' +
        'so give it its own, e.g. E2E_DATABASE_URL=postgres://app:app@localhost:5432/users_e2e ' +
        '(migrated and seeded). See docs/testing.md.',
    )
  }
  return {
    // An empty or non-numeric value falls back to the default instead of becoming port 0 or NaN.
    port: Number(env.E2E_PORT) || 4173,
    // The API gets its own port so an E2E run never talks to (or resets) a `pnpm api:dev` on 3001.
    apiPort: Number(env.E2E_API_PORT) || 3101,
    databaseUrl,
  }
}
