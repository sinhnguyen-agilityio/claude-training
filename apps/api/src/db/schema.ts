import { sql } from 'drizzle-orm'
import { pgEnum, pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core'
import { USER_ROLES, USER_STATUSES } from '@app/shared'

/** The database side of SPEC §3. The Zod schemas in `@app/shared` stay the source of validation. */
export const userRole = pgEnum('user_role', USER_ROLES)
export const userStatus = pgEnum('user_status', USER_STATUSES)

/** The unique index on `lower(email)`. The API reads this name from a 23505 error to answer 409. */
export const USERS_EMAIL_INDEX = 'users_email_lower_idx'

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    firstName: varchar('first_name', { length: 50 }).notNull(),
    lastName: varchar('last_name', { length: 50 }).notNull(),
    email: varchar('email').notNull(),
    phone: varchar('phone', { length: 20 }),
    role: userRole('role').notNull(),
    status: userStatus('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Email is unique case-insensitively (SPEC §3: 409 when taken).
    uniqueIndex(USERS_EMAIL_INDEX).on(sql`lower(${table.email})`),
  ],
)

export type UserRow = typeof users.$inferSelect
export type NewUserRow = typeof users.$inferInsert
