import { seedUsers } from '@app/shared'
import { users } from './schema'
import type { Database } from './types'

/**
 * Replaces every row of `users` with the 25 seed users of `@app/shared`, in one transaction, so a
 * failure leaves the table as it was and a second call still leaves 25 rows.
 */
export async function seedDatabase(db: Database): Promise<number> {
  await db.transaction(async (tx) => {
    await tx.delete(users)
    await tx.insert(users).values(
      seedUsers.map((user) => ({
        ...user,
        createdAt: new Date(user.createdAt),
        updatedAt: new Date(user.updatedAt),
      })),
    )
  })
  return seedUsers.length
}
