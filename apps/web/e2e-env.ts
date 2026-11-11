// Reads the environment of an E2E run. Kept out of playwright.config.ts so Vitest can test it.
export type E2eEnv = { port: number; apiPort: number; databaseUrl: string }

// Hosts that count as "this machine" (`db` is the Docker Compose service name).
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', 'db'])

const fail = (reason: string): never => {
  throw new Error(
    `${reason} \`pnpm e2e\` resets the database it points at before every test, so E2E_DATABASE_URL ` +
      'must name a local database made for it, e.g. ' +
      'E2E_DATABASE_URL=postgres://app:app@localhost:5432/users_e2e (migrated and seeded). ' +
      'See docs/testing.md.',
  )
}

// protocol-less, credential-less identity of a database: host, port and name. They are compared as
// parsed strings, so `db` and `localhost` for the same Compose database count as different (accepted).
function identity(url: URL): string {
  const name = url.pathname.replace(/^\/+|\/+$/g, '')
  return `${url.hostname.toLowerCase()}:${url.port || '5432'}/${name}`
}

export function resolveE2eEnv(env: NodeJS.ProcessEnv): E2eEnv {
  // POST /api/reset deletes every user in the database the API points at, so there is no default
  // and no fallback to DATABASE_URL: a run must name a database made for E2E.
  const databaseUrl = env.E2E_DATABASE_URL?.trim()
  if (!databaseUrl) return fail('E2E_DATABASE_URL is not set.')

  let url: URL
  try {
    url = new URL(databaseUrl)
  } catch {
    // The value is not echoed: it may hold a password.
    return fail('E2E_DATABASE_URL is not a valid URL.')
  }

  const devUrl = env.DATABASE_URL?.trim()
  if (devUrl) {
    let dev: URL | undefined
    try {
      dev = new URL(devUrl)
    } catch {
      // An unparsable DATABASE_URL cannot be the same database.
    }
    if (dev && identity(dev) === identity(url)) {
      return fail('E2E_DATABASE_URL is the same database as DATABASE_URL.')
    }
  }

  if (url.pathname.replace(/^\/+|\/+$/g, '') === 'users_dev') {
    return fail('E2E_DATABASE_URL points at users_dev, the development database.')
  }

  if (!LOCAL_HOSTS.has(url.hostname.toLowerCase()) && env.E2E_ALLOW_REMOTE_DB !== '1') {
    return fail(
      `E2E_DATABASE_URL points at the remote host ${url.hostname}. Set E2E_ALLOW_REMOTE_DB=1 to allow it.`,
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
