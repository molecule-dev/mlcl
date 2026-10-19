/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 * Everything here is served under `/api`: a route the client or a suite calls at
 * `/api/users` is declared as `/users`. Do not add a prefix of your own.
 */
import { Router } from 'express'

import alertsRouter from './alerts.js'
import arrivalsRouter from './arrivals.js'
import networkRouter from './network.js'
import notificationsRouter from './notifications.js'
import preferencesRouter from './preferences.js'
import savedStopsRouter from './saved-stops.js'
import tripsRouter from './trips.js'

const router = Router()

router.use('/network', networkRouter)
router.use('/arrivals', arrivalsRouter)
router.use('/trips', tripsRouter)
router.use('/alerts', alertsRouter)
router.use('/saved-stops', savedStopsRouter)
router.use('/notifications', notificationsRouter)
router.use('/preferences', preferencesRouter)

export default router
