import { z } from 'zod'

// An empty or whitespace-only string (for example `PORT=` in a .env file) counts as unset.
const unsetIfEmpty = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value

const envSchema = z.object({
  PORT: z.preprocess(unsetIfEmpty, z.coerce.number().int().min(1).max(65535).default(3001)),
  // Required: the API stores its users in PostgreSQL (SPEC §2).
  DATABASE_URL: z.preprocess(unsetIfEmpty, z.url()),
  // z.coerce.boolean() would turn the string "false" into true, so the two strings are explicit.
  ALLOW_RESET: z
    .preprocess(unsetIfEmpty, z.enum(['true', 'false']).default('false'))
    .transform((value) => value === 'true'),
  NODE_ENV: z.preprocess(
    unsetIfEmpty,
    z.enum(['development', 'test', 'production']).default('development'),
  ),
})

export type Env = z.output<typeof envSchema>

/**
 * Parses the environment. A bad value throws an error that names the variable and never shows
 * the value (it may be a secret, such as a password inside DATABASE_URL).
 */
export function loadEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source)
  if (result.success) return result.data

  const names = [
    ...new Set(result.error.issues.map((issue) => String(issue.path[0] ?? 'environment'))),
  ]
  throw new Error(`Invalid environment variables: ${names.join(', ')}`)
}
