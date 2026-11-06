import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    // drizzle-kit generate does not connect; only studio and push do.
    url: process.env.DATABASE_URL ?? 'postgres://app:app@localhost:5432/users_dev',
  },
})
