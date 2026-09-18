/**
 * Async handler wrapper.
 *
 * Express won't see a thrown error inside an async function unless you
 * `.catch(next)` it. Without this wrapper, every handler would need its own
 * `try { ... } catch (e) { next(e) }` boilerplate — and past versions of this
 * file used `try { ... } catch {}` which silently swallowed real errors and
 * returned a generic 500. Surfaced errors flow into the global error handler
 * in `server.ts`, which logs them so they show up in `dev.log`.
 */

import type { NextFunction, Request, RequestHandler, Response } from 'express'

type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<void> | Promise<Response> | Promise<unknown>

export const wrap =
  (fn: AsyncRequestHandler): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
