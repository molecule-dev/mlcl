/**
 * Wrap an async route handler so any thrown error reaches Express's
 * error middleware (where the api logger records it). Without this
 * wrapper Express 5 will still hand the rejection to the next error
 * handler — but past handlers in this app caught + swallowed real
 * errors with a generic 500, which obscured every silent bug from the
 * dev log AND from the test suite. The contract here: handlers throw,
 * the global error middleware logs + responds.
 *
 * @module
 */

import type { NextFunction, Request, Response } from 'express'

type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>

export function asyncHandler(fn: AsyncRequestHandler) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}
