import type { NextFunction, Request, RequestHandler, Response } from 'express'

type AsyncController = (req: Request, res: Response, next: NextFunction) => Promise<void> | void

/** Forwards an error thrown (or a promise rejected) in a controller to the error middleware. */
export function asyncHandler(controller: AsyncController): RequestHandler {
  return (req, res, next) => {
    // A synchronous throw needs no help: Express catches it and calls the error middleware.
    Promise.resolve(controller(req, res, next)).catch(next)
  }
}
