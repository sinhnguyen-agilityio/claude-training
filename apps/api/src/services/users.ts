import type { UsersPage, UsersQuery } from '@app/shared'
import { and, asc, count, desc, eq, ilike, or, sql } from 'drizzle-orm'
import { toUser } from '../db/mappers'
import { users } from '../db/schema'
import type { Database } from '../db/types'
import { escapeLike } from '../utils/escapeLike'

/**
 * One page of users for `GET /api/users` (SPEC §4). `q` matches the first name, the last name or the
 * email, each on its own and without regard to case; `role` and `status` narrow the result (AND).
 */
export async function listUsers(db: Database, query: UsersQuery): Promise<UsersPage> {
  const { q, role, status, sort, order, page, pageSize } = query

  const pattern = q ? `%${escapeLike(q)}%` : undefined
  const where = and(
    role ? eq(users.role, role) : undefined,
    status ? eq(users.status, status) : undefined,
    pattern
      ? or(
          ilike(users.firstName, pattern),
          ilike(users.lastName, pattern),
          ilike(users.email, pattern),
        )
      : undefined,
  )

  const [counted] = await db.select({ value: count() }).from(users).where(where)
  const total = counted?.value ?? 0

  // A page past the end is a normal answer (SPEC §4), and needs no second query.
  const offset = (page - 1) * pageSize
  if (offset >= total) return { data: [], total, page, pageSize }

  // Names are compared with lower(), so letter case does not change the order (A1). Punctuation and
  // accents (O'Brien, Éva) still follow the collation of the database. The id makes the order total,
  // so paging never repeats or skips a user (A2).
  const direction = order === 'asc' ? asc : desc
  const orderBy =
    sort === 'name'
      ? [
          direction(sql`lower(${users.lastName})`),
          direction(sql`lower(${users.firstName})`),
          direction(users.id),
        ]
      : [direction(users.createdAt), direction(users.id)]

  const rows = await db
    .select()
    .from(users)
    .where(where)
    .orderBy(...orderBy)
    .limit(pageSize)
    .offset(offset)

  return { data: rows.map(toUser), total, page, pageSize }
}
