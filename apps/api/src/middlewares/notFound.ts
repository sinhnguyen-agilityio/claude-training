import type { RequestHandler } from 'express'
import { HTTP_STATUS } from '../constants/http'

/** Answers a request that no route under /api matched (SPEC §4 error body). */
export const notFound: RequestHandler = (_req, res) => {
  res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Not found' })
}
