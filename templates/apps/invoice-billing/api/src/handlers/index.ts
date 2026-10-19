/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 * Everything here is served under `/api`: a route the client or a suite calls at
 * `/api/users` is declared as `/users`. Do not add a prefix of your own.
 */
import { Router } from 'express'

import clients from './clients.js'
import dashboard from './dashboard.js'
import exportsRouter from './exports.js'
import invoices from './invoices.js'
import notifications from './notifications.js'
import payments from './payments.js'
import profile from './profile.js'
import recurring from './recurring.js'
import reports from './reports.js'
import taxRates from './tax-rates.js'

const router = Router()

router.use('/clients', clients)
router.use('/dashboard', dashboard)
router.use('/exports', exportsRouter)
router.use('/invoices', invoices)
router.use('/notifications', notifications)
router.use('/payments', payments)
router.use('/profile', profile)
router.use('/recurring', recurring)
router.use('/reports', reports)
router.use('/tax-rates', taxRates)

export default router
