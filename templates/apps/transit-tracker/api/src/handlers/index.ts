/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
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
