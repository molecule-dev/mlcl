import { Router } from 'express'

import adherenceRouter from './adherence.js'
import caregiversRouter from './caregivers.js'
import dosesRouter from './doses.js'
import medicationsRouter from './medications.js'
import notificationsRouter from './notifications.js'
import refillsRouter from './refills.js'
import reportsRouter from './reports.js'
import schedulesRouter from './schedules.js'

const router = Router()

router.use('/medications', medicationsRouter)
router.use('/schedules', schedulesRouter)
router.use('/doses', dosesRouter)
router.use('/refills', refillsRouter)
router.use('/adherence', adherenceRouter)
router.use('/reports', reportsRouter)
router.use('/caregivers', caregiversRouter)
router.use('/notifications', notificationsRouter)

export default router
