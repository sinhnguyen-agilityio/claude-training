import { randomBytes } from 'node:crypto'
import { readMigrationFiles } from 'drizzle-orm/migrator'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { afterAll } from 'vitest'
import { MIGRATIONS_FOLDER } from '../db/migrate'
import * as schema from '../db/schema'
import { seedDatabase } from '../db/seed'
import type { Database } from '../db/types'

/** The Postgres of `pnpm db:up` with the defaults of `.env.example`, used when `DATABASE_URL` is unset. */
export const TEST_DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgres://app:app@localhost:5432/users_dev'

/**
 * drizzle-kit writes enum types as "public"."user_role"; point them at a test schema. Every other
 * object in the migration is unqualified and follows the search_path of the pool. A statement that
 * still names `public` afterwards would change the shared schema and break the isolation between
 * test files, so it is refused instead of run.
 */
export function moveToSchema(statement: string, schemaName: string): string {
  const moved = statement.replaceAll('"public".', `"${schemaName}".`)
  if (/\bpublic\b/i.test(moved)) {
    throw new Error(
      `A migration statement still refers to the public schema, so test files would share it: ${moved.slice(0, 80)}`,
    )
  }
  return moved
}

export interface TestDb {
  db: Database
  pool: Pool
  /** The Postgres schema that belongs to this test file. */
  schema: string
  /** Drops the schema and closes the pool. `afterAll` calls it; calling it again does nothing. */
  drop: () => Promise<void>
}

/**
 * Gives a test file its own Postgres schema, migrated and optionally seeded, so files running in
 * parallel never see each other's rows. Call it once at the top of a test file; the schema is
 * dropped in `afterAll`. Needs the database of `pnpm db:up`.
 */
export async function createTestDb(options: { seed?: boolean } = {}): Promise<TestDb> {
  const name = `test_${randomBytes(8).toString('hex')}`
  const pool = new Pool({
    connectionString: TEST_DATABASE_URL,
    max: 3,
    // Every unqualified table and type in the migration resolves to this file's schema.
    options: `-c search_path=${name}`,
  })

  let dropped = false
  const drop = async () => {
    if (dropped) return
    dropped = true
    try {
      await pool.query(`DROP SCHEMA IF EXISTS "${name}" CASCADE`)
    } finally {
      await pool.end()
    }
  }
  // Registered before the setup, so a failed setup does not leave the schema behind.
  afterAll(drop)

  try {
    await pool.query(`CREATE SCHEMA "${name}"`)
  } catch (error) {
    throw new Error('Cannot reach the test database. Is it running? Start it with `pnpm db:up`.', {
      cause: error,
    })
  }

  for (const migration of readMigrationFiles({ migrationsFolder: MIGRATIONS_FOLDER })) {
    for (const statement of migration.sql) {
      await pool.query(moveToSchema(statement, name))
    }
  }

  const db = drizzle(pool, { schema })
  if (options.seed) await seedDatabase(db)

  return { db, pool, schema: name, drop }
}
