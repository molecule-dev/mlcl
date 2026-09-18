/**
 * URL aliases for host-scoped collections.
 *
 * The frontend pages (HostDashboard, Reservations, HostListingDetail)
 * were authored against /api/reservations and /api/host-listings — the
 * canonical handlers live under /api/bookings (with ?role=host) and
 * /api/listings (with ?host=me). These thin wrappers default those
 * query params so the frontend URL contract stays clean.
 */

import type { NextFunction, Request, RequestHandler, Response } from 'express'
import { Router } from 'express'

import bookingsRouter from './bookings.js'
import listingsRouter from './listings.js'

// Express 5 makes `req.query` a getter-only property — direct
// assignment is silently dropped. Use `Object.defineProperty` to
// install a writable own-property shadow with our default applied.
function withQueryDefault(key: string, defaultValue: string): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const current = (req.query as Record<string, unknown>)[key]
    if (current == null || current === '') {
      const merged = { ...(req.query as Record<string, unknown>), [key]: defaultValue }
      Object.defineProperty(req, 'query', {
        value: merged,
        writable: true,
        enumerable: true,
        configurable: true,
      })
    }
    next()
  }
}

const reservationsRouter = Router()
reservationsRouter.use(withQueryDefault('role', 'host'))
reservationsRouter.use(bookingsRouter)

const hostListingsRouter = Router()
hostListingsRouter.use(withQueryDefault('host', 'me'))
hostListingsRouter.use(listingsRouter)

export { hostListingsRouter, reservationsRouter }
