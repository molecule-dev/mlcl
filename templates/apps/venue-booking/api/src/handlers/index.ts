import type { NextFunction, Request, Response } from 'express'
import { Router } from 'express'

import { logger } from '@molecule/api-logger'

import { seedDemoForUser, seedGlobalCatalogIfEmpty } from './_seed.js'
import bookingsRouter from './bookings.js'
import favoritesRouter from './favorites.js'
import hostMetricsRouter from './host_metrics.js'
import messagesRouter from './messages.js'
import notificationsRouter from './notifications.js'
import profileRouter from './profile.js'
import reservationsRouter from './reservations.js'
import reviewsRouter from './reviews.js'
import venuesRouter from './venues.js'

const router = Router()

// Bootstrap the venue catalog the first time any request hits the
// template surface. Idempotent — `seedGlobalCatalogIfEmpty` returns
// fast on subsequent calls because the venues table is non-empty.
let seedPromise: Promise<unknown> | null = null
router.use(async (_req: Request, _res: Response, next: NextFunction) => {
  if (!seedPromise) {
    seedPromise = seedGlobalCatalogIfEmpty().catch(() => {
      // Reset on failure so a later request can retry. Failure here
      // doesn't block the request — empty venues just yield empty
      // listings on /search until the user re-tries.
      seedPromise = null
    })
  }
  // Wait for the seed so the very first request that triggers the
  // bootstrap doesn't return stale data on the subsequent fetch.
  await seedPromise.catch(() => {})
  next()
})

// Per-user demo bootstrap: on any authed request, lazily seed favorites
// / notifications / sample message thread once. The set in-memory keeps
// us from re-checking after the first hit per process.
const seededUsers = new Set<string>()
router.use(async (_req: Request, res: Response, next: NextFunction) => {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (userId && !seededUsers.has(userId)) {
    seededUsers.add(userId)
    try {
      await seedDemoForUser(userId)
    } catch (error) {
      logger.warn('handlers.seedDemoForUser', error)
      seededUsers.delete(userId)
    }
  }
  next()
})

// Domain canonical routes
router.use('/venues', venuesRouter)
router.use('/bookings', bookingsRouter)
router.use('/reviews', reviewsRouter)

// View-shaped routes consumed by the React app
router.use('/reservations', reservationsRouter)
router.use('/favorites', favoritesRouter)
router.use('/messages', messagesRouter)
router.use('/notifications', notificationsRouter)
router.use('/host_metrics', hostMetricsRouter)
router.use('/profile', profileRouter)

export default router
