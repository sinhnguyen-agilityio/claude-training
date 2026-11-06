import type { RequestHandler } from 'express'
import type { Logger } from '../utils/logger'

/**
 * Writes one line per request when it ends: method, path, status and duration in ms. The `close`
 * event fires once for every request, also when the client hangs up before the response is sent
 * (`finish` would miss it). The path has no query string and the body is never read, so values a
 * user typed stay out of the log.
 */
export function requestLogger(logger: Logger): RequestHandler {
  return (req, res, next) => {
    const start = process.hrtime.bigint()
    // Read the path now: a router rewrites req.url while it handles the request.
    const path = req.originalUrl.split('?')[0]

    res.once('close', () => {
      const ms = Math.round(Number(process.hrtime.bigint() - start) / 1e6)
      logger.info(`${req.method} ${path} ${res.statusCode} ${ms}ms`)
    })
    next()
  }
}
