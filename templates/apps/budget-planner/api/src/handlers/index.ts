/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 */
import { Router } from 'express'

import accounts from './accounts.js'
import categories from './categories.js'
import envelopes from './envelopes.js'
import goals from './goals.js'
import importExport from './import_export.js'
import notifications from './notifications.js'
import payments from './payments.js'
import profile from './profile.js'
import reports from './reports.js'
import transactions from './transactions.js'

const router = Router()

router.use('/accounts', accounts)
router.use('/categories', categories)
router.use('/envelopes', envelopes)
router.use('/goals', goals)
router.use('/notifications', notifications)
router.use('/payments', payments)
router.use('/profile', profile)
router.use('/reports', reports)
router.use('/transactions', transactions)
router.use('/', importExport)

export default router
