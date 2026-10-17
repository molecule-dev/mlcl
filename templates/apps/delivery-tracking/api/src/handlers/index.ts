/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 */
import { Router } from 'express'

import alerts from './alerts.js'
import carriers from './carriers.js'
import notifications from './notifications.js'
import shipments from './shipments.js'
import team from './team.js'
import tracking from './tracking.js'
import webhooks from './webhooks.js'

const router = Router()

router.use('/shipments', shipments)
router.use('/tracking', tracking)
router.use('/carriers', carriers)
router.use('/notifications', notifications)
router.use('/alerts', alerts)
router.use('/webhooks', webhooks)
router.use('/team', team)

export default router
