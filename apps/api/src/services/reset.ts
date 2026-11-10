import { seedDatabase } from '../db/seed'
import type { Database } from '../db/types'

/**
 * Puts the 25 seed users back (#43, A3). It is `seedDatabase`, the code behind `pnpm db:seed`:
 * delete and insert run in one transaction, so a failure leaves the rows as they were, and a
 * second call gives the same result.
 */
export async function resetUsers(db: Database): Promise<void> {
  await seedDatabase(db)
}
