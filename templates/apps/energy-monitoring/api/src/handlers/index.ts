/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 */
import { Router } from 'express'

import alerts from './alerts.js'
import costs from './costs.js'
import me from './me.js'
import meters from './meters.js'
import readings from './readings.js'

const router = Router()

router.use('/meters', meters)
router.use('/readings', readings)
router.use('/costs', costs)
router.use('/alerts', alerts)
router.use('/me', me)

export default router
