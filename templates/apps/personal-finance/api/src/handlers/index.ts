import { Router } from 'express'

import billing from '../routes/billing.js'
import accounts from './accounts.js'
import budgets from './budgets.js'
import categories from './categories.js'
import dataExport from './data-export.js'
import goals from './goals.js'
import notifications from './notifications.js'
import reports from './reports.js'
import transactions from './transactions.js'

const router = Router()

router.use('/accounts', accounts)
router.use('/transactions', transactions)
router.use('/budgets', budgets)
router.use('/goals', goals)
router.use('/categories', categories)
router.use('/reports', reports)
router.use('/notifications', notifications)
router.use('/billing', billing)
router.use('/export', dataExport)

export default router
