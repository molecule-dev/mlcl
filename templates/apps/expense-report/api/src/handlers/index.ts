import { Router } from 'express'

import approvals from './approvals.js'
import dashboard from './dashboard.js'
import expenses from './expenses.js'
import notifications from './notifications.js'
import policies from './policies.js'
import preferences from './preferences.js'
import receipts from './receipts.js'
import reports from './reports.js'

const router = Router()

router.use('/expenses', expenses)
router.use('/reports', reports)
router.use('/policies', policies)
router.use('/preferences', preferences)
router.use('/approvals', approvals)
router.use('/receipts', receipts)
router.use('/notifications', notifications)
router.use('/dashboard', dashboard)

export default router
