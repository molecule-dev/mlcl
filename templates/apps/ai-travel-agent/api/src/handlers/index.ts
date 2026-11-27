/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 * Everything here is served under `/api`: a route the client or a suite calls at
 * `/api/users` is declared as `/users`. Do not add a prefix of your own.
 */
import { Router } from 'express'

import testEndpoints from './_test.js'
import bookingsRouter from './bookings.js'
import conversationsRouter from './conversations.js'
import flightsRouter from './flights.js'
import notificationsRouter from './notifications.js'
import preferencesRouter from './preferences.js'
import profileRouter from './profile.js'
import speechRouter from './speech.js'
import { payRouter, splitsRouter } from './splits.js'
import tripsRouter from './trips.js'

const router = Router()

router.use('/conversations', conversationsRouter)
router.use('/flights', flightsRouter)
router.use('/trips', tripsRouter)
router.use('/bookings', bookingsRouter)
router.use('/splits', splitsRouter)
router.use('/pay', payRouter)
router.use('/notifications', notificationsRouter)
router.use('/speech', speechRouter)
router.use('/preferences', preferencesRouter)
router.use('/profile', profileRouter)
router.use('/_test', testEndpoints)

export default router
