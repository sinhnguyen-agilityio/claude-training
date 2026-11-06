import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { loadEnv } from '../config/env'
import { stdLogger } from '../utils/logger'
import * as schema from './schema'

// Kept small: the API may run as several short-lived instances (Vercel, #48), each with its own pool.
const MAX_CONNECTIONS = 5

const { DATABASE_URL } = loadEnv(process.env)

export const pool = new Pool({ connectionString: DATABASE_URL, max: MAX_CONNECTIONS })
// An idle client can fail (the database restarts, the network drops). Without a listener, Node
// treats that 'error' event as an uncaught exception and the whole API exits; with one, the pool
// drops the client and the next query opens a new connection.
pool.on('error', (error) => stdLogger.error('Idle database client failed', error))
export const db = drizzle(pool, { schema })
