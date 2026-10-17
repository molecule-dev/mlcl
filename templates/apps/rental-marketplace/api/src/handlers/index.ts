/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 */
import type { NextFunction, Request, Response } from 'express'
import { Router } from 'express'

import { hostListingsRouter, reservationsRouter } from './_aliases.js'
import { seedDemoForUser, seedGlobalCatalogIfEmpty } from './_seed.js'
import testEndpoints from './_test.js'
import bookingsRouter from './bookings.js'
import bookmarksRouter from './bookmarks.js'
import hostsRouter from './hosts.js'
import listingsRouter from './listings.js'
import messagesRouter from './messages.js'
import notificationsRouter from './notifications.js'
import payoutsRouter from './payouts.js'
import reviewsRouter from './reviews.js'
import settingsRouter from './settings.js'
import uploadsRouter from './uploads.js'

const router = Router()

// Bootstrap the demo listings catalog the first time any request hits
// the template surface. Idempotent — `seedGlobalCatalogIfEmpty` returns
// fast on subsequent calls because the listings table is non-empty.
//
// We AWAIT the inflight promise before next() so the very first
// request after dev-server startup (e.g. GET /api/listings on landing)
// doesn't race the insert and return an empty array. Subsequent
// requests pay only the resolved-promise tick.
let seedPromise: Promise<unknown> | null = null
router.use(async (_req: Request, _res: Response, next: NextFunction) => {
  if (!seedPromise) {
    seedPromise = seedGlobalCatalogIfEmpty().catch(() => {
      // Reset on failure so a later request can retry. Failure here
      // doesn't block the request — empty listings just yield empty
      // search results until the user re-tries.
      seedPromise = null
    })
  }
  await seedPromise
  next()
})

// Per-user demo seed: idempotent, runs the FIRST time we see an
// authenticated user. Without this a freshly signed-up user lands on
// /wishlist, /notifications, /messages with empty content even though
// the seed defines starter data. Each user is seeded once per process;
// the underlying SQL counts also block reseeding across restarts.
//
// The middleware AWAITS the inflight seed before calling next() so the
// very first authenticated GET (e.g. GET /api/bookmarks immediately
// after signup) sees the seeded rows — a fire-and-forget would race the
// GET and return an empty list on first paint.
const seededUsers = new Set<string>()
const inflightSeed = new Map<string, Promise<unknown>>()
router.use(async (_req: Request, res: Response, next: NextFunction) => {
  const userId = res.locals.session?.userId as string | undefined
  if (!userId || seededUsers.has(userId)) {
    return next()
  }
  let p = inflightSeed.get(userId)
  if (!p) {
    p = seedDemoForUser(userId)
      .then(() => {
        seededUsers.add(userId)
      })
      .catch(() => {
        // best-effort; next request retries
      })
      .finally(() => {
        inflightSeed.delete(userId)
      })
    inflightSeed.set(userId, p)
  }
  await p
  next()
})

router.use('/listings', listingsRouter)
router.use('/bookings', bookingsRouter)
// `/api/reservations` and `/api/host-listings` are the host-friendly
// aliases used by HostDashboard + Reservations.tsx. They wrap the
// canonical /bookings + /listings handlers and default ?role=host /
// ?host=me so the frontend URL contract stays clean.
router.use('/reservations', reservationsRouter)
router.use('/host-listings', hostListingsRouter)
router.use('/reviews', reviewsRouter)
router.use('/messages', messagesRouter)
router.use('/hosts', hostsRouter)
router.use('/payouts', payoutsRouter)
router.use('/bookmarks', bookmarksRouter)
router.use('/wishlist', bookmarksRouter)
router.use('/notifications', notificationsRouter)
// Server-side settings channel — phone + notification preferences live in
// the user row's oauthData blob, which the platform user resource never
// echoes on reads. GET/PATCH here read and merge it server-side so
// Settings read-after-write actually persists. See handlers/settings.ts.
router.use('/settings', settingsRouter)
// Dev-only test introspection (404 unless ENABLE_E2E_TEST_ENDPOINTS=true);
// stands in for the email inbox in reset-password e2e. See handlers/_test.ts.
router.use('/_test', testEndpoints)
// Listing-photo uploads: POST streams to the uploads bond, GET streams back.
router.use('/uploads', uploadsRouter)
export default router
