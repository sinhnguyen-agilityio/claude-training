import { sql } from 'drizzle-orm'
import type { RequestHandler } from 'express'
import { DATABASE_UNAVAILABLE } from '../constants/messages'
import type { Database } from '../db/types'
import { HTTP_STATUS } from '../constants/http'

/** How long `select 1` may take before the database counts as unreachable (SPEC §4, #48). */
export const HEALTH_TIMEOUT_MS = 5000

function timeout(ms: number): { promise: Promise<never>; clear: () => void } {
  let timer: ReturnType<typeof setTimeout> | undefined
  const promise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Health check timed out')), ms)
  })
  return { promise, clear: () => clearTimeout(timer) }
}

/**
 * 200 `{ status: "ok" }`. With a database it first runs `select 1` (5-second limit) and answers
 * 503 `{ message }` when that fails, so a host health check sees an unreachable database.
 *
 * The race only stops waiting: a hung `select 1` keeps its pool connection (one of 5) after the
 * 503. Low risk, since it happens only when the database is already unreachable.
 */
export function createGetHealth(db?: Database): RequestHandler {
  return async (_req, res) => {
    if (db) {
      const limit = timeout(HEALTH_TIMEOUT_MS)
      try {
        await Promise.race([db.execute(sql`select 1`), limit.promise])
      } catch {
        res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({ message: DATABASE_UNAVAILABLE })
        return
      } finally {
        limit.clear()
      }
    }
    res.json({ status: 'ok' })
  }
}
