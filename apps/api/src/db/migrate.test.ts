import { randomBytes } from 'node:crypto'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { afterAll, describe, expect, it } from 'vitest'
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
  await pool?.end()
  await admin.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`)
  await admin.end()
})

describe('runMigrations', () => {
  it('creates the users table and a second run changes nothing', async () => {
    await admin.query(`CREATE DATABASE "${databaseName}"`)
    pool = new Pool({ connectionString: url.toString(), max: 2 })
    const db = drizzle(pool, { schema })
    const applied = () => pool!.query('SELECT hash FROM drizzle.__drizzle_migrations ORDER BY id')

    await runMigrations(db)
    const afterFirst = (await applied()).rows
    await pool.query(
      `INSERT INTO users (first_name, last_name, email, role) VALUES ('Ada', 'Lovelace', 'ada@example.com', 'editor')`,
    )

    await expect(runMigrations(db)).resolves.toBeUndefined()

    expect(afterFirst).toHaveLength(1)
    expect((await applied()).rows).toEqual(afterFirst)
    const { rows } = await pool.query('SELECT status FROM users')
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
