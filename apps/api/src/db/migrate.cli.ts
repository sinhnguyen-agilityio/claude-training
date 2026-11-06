import { db, pool } from './client'
import { runMigrations } from './migrate'

try {
  await runMigrations(db)
  process.stdout.write('Migrations applied\n')
} finally {
  await pool.end()
}
