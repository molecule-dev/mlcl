import { Router } from 'express'

import accounts from './accounts.js'
import customers from './customers.js'
import expenses from './expenses.js'
import invoices from './invoices.js'
import notifications from './notifications.js'
import payments from './payments.js'
import reports from './reports.js'
import settings from './settings.js'

const router = Router()

router.use('/invoices', invoices)
router.use('/expenses', expenses)
router.use('/accounts', accounts)
router.use('/customers', customers)
router.use('/payments', payments)
router.use('/notifications', notifications)
router.use('/reports', reports)
router.use('/settings', settings)

export default router
