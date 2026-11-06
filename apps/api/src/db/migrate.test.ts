import { randomBytes } from 'node:crypto'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { TEST_DATABASE_URL } from '../test/createTestDb'
import { runMigrations } from './migrate'
import * as schema from './schema'

// Migrations record themselves in a table of the database, so this test needs a whole database of
// its own: the schema-per-file helper would not show whether a second run changes anything.
const databaseName = `test_migrate_${randomBytes(8).toString('hex')}`
const admin = new Pool({ connectionString: TEST_DATABASE_URL, max: 1 })

const url = new URL(TEST_DATABASE_URL)
url.pathname = `/${databaseName}`
let pool: Pool | undefined

afterAll(async () => {
  try {
    await pool?.end()
    // pool.end() returns when the client side is done, but the server may still be closing the last
    // session. Dropping the database with FORCE at that moment makes that session report a fatal
    // "terminating connection" error that nothing listens to (seen once in a full run). So wait until
    // the server lists no session on the database, then drop it normally.
    await vi.waitFor(
      async () => {
        const { rows } = await admin.query('SELECT 1 FROM pg_stat_activity WHERE datname = $1', [
          databaseName,
        ])
        expect(rows).toHaveLength(0)
      },
      { timeout: 10_000 },
    )
  } finally {
    // Even when the wait gave up, try to drop the database and always close the pool.
    try {
      await admin.query(`DROP DATABASE IF EXISTS "${databaseName}"`)
    } finally {
      await admin.end()
    }
  }
}, 20_000)

// CREATE DATABASE copies a template database, which can take several seconds when the machine is
// busy (a full run starts the web and API tests at once), so it gets a longer limit than a test.
beforeAll(async () => {
  await admin.query(`CREATE DATABASE "${databaseName}"`)
  pool = new Pool({ connectionString: url.toString(), max: 2 })
}, 30_000)

describe('runMigrations', () => {
  it('creates the users table and a second run changes nothing', async () => {
    const db = drizzle(pool!, { schema })
    const applied = () => pool!.query('SELECT hash FROM drizzle.__drizzle_migrations ORDER BY id')

    await runMigrations(db)
    const afterFirst = (await applied()).rows
    await pool!.query(
      `INSERT INTO users (first_name, last_name, email, role) VALUES ('Ada', 'Lovelace', 'ada@example.com', 'editor')`,
    )

    await expect(runMigrations(db)).resolves.toBeUndefined()

    expect(afterFirst).toHaveLength(1)
    expect((await applied()).rows).toEqual(afterFirst)
    const { rows } = await pool!.query('SELECT status FROM users')
    expect(rows).toEqual([{ status: 'active' }])
  })

  it('makes email unique without regard to case', async () => {
    await expect(
      pool!.query(
        `INSERT INTO users (first_name, last_name, email, role) VALUES ('Other', 'Ada', 'ADA@Example.com', 'viewer')`,
      ),
    ).rejects.toMatchObject({ constraint: 'users_email_lower_idx' })
  })
})
