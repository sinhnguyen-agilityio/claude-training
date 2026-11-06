import { db, pool } from './client'
import { seedDatabase } from './seed'

try {
  const count = await seedDatabase(db)
  process.stdout.write(`Seeded ${count} users\n`)
} finally {
  await pool.end()
}
