/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 */
import { Router } from 'express'

import alarmsRouter from './alarms.js'
import coachingRouter from './coaching.js'
import factorsRouter from './factors.js'
import notificationsRouter from './notifications.js'
import sleepRouter from './sleep.js'
import statsRouter from './stats.js'
import wearablesRouter from './wearables.js'

const router = Router()

router.use('/sleep', sleepRouter)
router.use('/alarms', alarmsRouter)
router.use('/stats', statsRouter)
router.use('/factors', factorsRouter)
router.use('/wearables', wearablesRouter)
router.use('/coaching', coachingRouter)
router.use('/notifications', notificationsRouter)
export default router
