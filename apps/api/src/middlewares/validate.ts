import type { RequestHandler } from 'express'
import type { ZodType } from 'zod'
import { HTTP_STATUS } from '../constants/http'

interface ValidateSchemas {
  body?: ZodType
  query?: ZodType
  params?: ZodType
}

const PARTS = ['body', 'query', 'params'] as const

/**
 * Validates the parts of a request that have a schema. Invalid input answers 400
 * `{ message: 'Validation failed', fieldErrors }` with the first message per field (nested paths are
 * joined with dots, an error on the whole value uses the key `_`). Valid input is available on
 * `req.validated`.
 */
export function validate(schemas: ValidateSchemas): RequestHandler {
  return (req, res, next) => {
    const fieldErrors: Record<string, string> = {}
    const validated: NonNullable<typeof req.validated> = {}

    for (const part of PARTS) {
      const schema = schemas[part]
      if (!schema) continue

      // Express 5 leaves req.body undefined when nothing was parsed (no body, no JSON content type).
      // An empty object gives one error per missing field, which a form can map to its inputs.
      const input = part === 'body' ? (req.body ?? {}) : req[part]
      const result = schema.safeParse(input)
      if (result.success) {
        validated[part] = result.data
        continue
      }
      for (const issue of result.error.issues) {
        const field = issue.path.length > 0 ? issue.path.map(String).join('.') : '_'
        fieldErrors[field] ??= issue.message
      }
    }

    if (Object.keys(fieldErrors).length > 0) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'Validation failed', fieldErrors })
      return
    }
    req.validated = validated
    next()
  }
}
