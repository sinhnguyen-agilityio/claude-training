import { fileURLToPath } from 'node:url'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import type { Database } from './types'

/** Where `pnpm db:generate` writes the SQL migrations. */
export const MIGRATIONS_FOLDER = fileURLToPath(new URL('../../drizzle', import.meta.url))

/**
 * Applies the migrations that have not run yet. Drizzle records each one in
 * `drizzle.__drizzle_migrations`, so a second call changes nothing.
 */
export async function runMigrations(db: Database): Promise<void> {
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER })
}
