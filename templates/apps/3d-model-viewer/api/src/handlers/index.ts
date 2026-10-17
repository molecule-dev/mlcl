/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 */
import { Router } from 'express'

import activity from './activity.js'
import annotations from './annotations.js'
import embeds from './embeds.js'
import models from './models.js'
import notifications from './notifications.js'

const router = Router()

router.use('/models', models)
router.use('/annotations', annotations)
router.use('/embeds', embeds)
router.use('/notifications', notifications)
router.use('/activity', activity)

export default router
