/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 */
import { Router } from 'express'

import adherenceRouter from './adherence.js'
import caregiversRouter from './caregivers.js'
import dosesRouter from './doses.js'
import medicationsRouter from './medications.js'
import notificationsRouter from './notifications.js'
import refillsRouter from './refills.js'
import reportsRouter from './reports.js'
import schedulesRouter from './schedules.js'
import settingsRouter from './settings.js'

const router = Router()

router.use('/medications', medicationsRouter)
router.use('/schedules', schedulesRouter)
router.use('/doses', dosesRouter)
router.use('/refills', refillsRouter)
router.use('/adherence', adherenceRouter)
router.use('/reports', reportsRouter)
router.use('/caregivers', caregiversRouter)
router.use('/notifications', notificationsRouter)
router.use('/settings', settingsRouter)

export default router
