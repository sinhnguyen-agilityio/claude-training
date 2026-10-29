import { z } from 'zod'

/**
 * The single source of truth for user validation (SPEC §2, §3).
 * Both the form and the mock API parse with these schemas, so they can never disagree.
 */

export const USER_ROLES = ['admin', 'editor', 'viewer'] as const
export const USER_STATUSES = ['active', 'inactive'] as const

const PHONE_CHARS = /^[0-9+\-() ]+$/

function nameSchema(label: string) {
  return z
    .string({ error: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)
    .max(50, `${label} must be at most 50 characters`)
}

const emailSchema = z
  .string({ error: 'Email is required' })
  .trim()
  .toLowerCase()
  .min(1, 'Email is required')
  .pipe(z.email('Enter a valid email address'))

/** Optional phone: blank input becomes `null`; the 7–20 length counts formatting characters. */
const phoneSchema = z
  .string()
  .trim()
  .nullable()
  .transform((value) => (value ? value : null))
  .pipe(
    z
      .string()
      .min(7, 'Phone must be at least 7 characters')
      .max(20, 'Phone must be at most 20 characters')
      .regex(PHONE_CHARS, 'Phone may only contain digits, spaces, +, - and ()')
      .nullable(),
  )

const roleSchema = z.enum(USER_ROLES, { error: 'Choose a role' })
const statusSchema = z.enum(USER_STATUSES, { error: 'Choose a status' })

const userFields = {
  firstName: nameSchema('First name'),
  lastName: nameSchema('Last name'),
  email: emailSchema,
  phone: phoneSchema,
  role: roleSchema,
  status: statusSchema,
}

/** Body of `POST /api/users` and the create form. */
export const userCreateSchema = z.object({
  ...userFields,
  phone: phoneSchema.default(null),
  status: statusSchema.default('active'),
})

/** Body of `PATCH /api/users/:id`: any subset of the editable fields, with no defaults applied. */
export const userUpdateSchema = z.object(userFields).partial()

/** A stored user, as returned by the API. */
export const userSchema = z.object({
  id: z.uuid(),
  ...userFields,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})

export type UserRole = (typeof USER_ROLES)[number]
export type UserStatus = (typeof USER_STATUSES)[number]
/** Raw values as typed into the create form, before normalisation. */
export type UserCreateInput = z.input<typeof userCreateSchema>
export type UserCreate = z.output<typeof userCreateSchema>
export type UserUpdate = z.output<typeof userUpdateSchema>
export type User = z.output<typeof userSchema>
