/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 */
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
