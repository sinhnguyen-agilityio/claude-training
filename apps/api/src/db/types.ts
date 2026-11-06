import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type * as schema from './schema'

/** The Drizzle database that services, the seed and the migrations take, so tests can pass their own. */
export type Database = NodePgDatabase<typeof schema>
