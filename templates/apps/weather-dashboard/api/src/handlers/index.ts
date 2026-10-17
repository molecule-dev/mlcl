/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 */
import { Router } from 'express'

import alerts from './alerts.js'
import forecasts from './forecasts.js'
import history from './history.js'
import locations from './locations.js'

const router = Router()

router.use('/locations', locations)
router.use('/forecasts', forecasts)
router.use('/alerts', alerts)
router.use('/history', history)

export default router
