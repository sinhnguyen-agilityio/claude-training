import type { ErrorRequestHandler } from 'express'
import { HTTP_STATUS } from '../constants/http'
import type { Logger } from '../utils/logger'

/** body-parser marks a body that is not valid JSON with this type. */
function isInvalidJson(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    error.type === 'entity.parse.failed'
  )
}

/** body-parser sets `status` on the errors that are the client's fault (413 too large, 415, ...). */
function clientErrorStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null || !('status' in error)) return undefined
  const { status } = error
  return typeof status === 'number' && status >= 400 && status < 500 ? status : undefined
}

/**
 * The last middleware. Invalid JSON is the client's mistake (400), and so is any other 4xx that
 * body-parser raises (a body that is too large is 413); anything else is unexpected: it is logged
 * here, and the client gets a generic 500 with no stack trace, SQL or message from the error.
 */
export function errorHandler(logger: Logger): ErrorRequestHandler {
  return (error, _req, res, next) => {
    if (res.headersSent) {
      next(error)
      return
    }
    if (isInvalidJson(error)) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'Invalid JSON' })
      return
    }
    const status = clientErrorStatus(error)
    if (status !== undefined) {
      const message = status === HTTP_STATUS.PAYLOAD_TOO_LARGE ? 'Payload too large' : 'Bad request'
      res.status(status).json({ message })
      return
    }
    logger.error('Unhandled error', error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error' })
  }
}
