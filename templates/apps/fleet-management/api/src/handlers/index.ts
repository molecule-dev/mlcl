/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 * Everything here is served under `/api`: a route the client or a suite calls at
 * `/api/users` is declared as `/users`. Do not add a prefix of your own.
 */
import { Router } from 'express'

import billing from '../routes/billing.js'
import alerts from './alerts.js'
import drivers from './drivers.js'
import geofences from './geofences.js'
import maintenance from './maintenance.js'
import notifications from './notifications.js'
import reports from './reports.js'
import routes from './routes.js'
import settings from './settings.js'
import trips from './trips.js'
import vehicles from './vehicles.js'

const router = Router()

router.use('/vehicles', vehicles)
router.use('/drivers', drivers)
router.use('/routes', routes)
router.use('/maintenance', maintenance)
router.use('/geofences', geofences)
router.use('/trips', trips)
router.use('/alerts', alerts)
router.use('/notifications', notifications)
router.use('/reports', reports)
router.use('/settings', settings)
router.use('/billing', billing)

export default router
