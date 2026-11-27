/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 * Everything here is served under `/api`: a route the client or a suite calls at
 * `/api/users` is declared as `/users`. Do not add a prefix of your own.
 */
import { Router } from 'express'

import clientsRouter from './clients.js'
import dashboardRouter from './dashboard.js'
import exportsRouter from './exports.js'
import invoicesRouter from './invoices.js'
import notificationsRouter from './notifications.js'
import paymentsRouter from './payments.js'
import profileRouter from './profile.js'
import recurringRouter from './recurring.js'
import reportsRouter from './reports.js'
import taxRatesRouter from './tax-rates.js'

const router = Router()

router.use('/clients', clientsRouter)
router.use('/dashboard', dashboardRouter)
router.use('/exports', exportsRouter)
router.use('/invoices', invoicesRouter)
router.use('/notifications', notificationsRouter)
router.use('/payments', paymentsRouter)
router.use('/profile', profileRouter)
router.use('/recurring', recurringRouter)
router.use('/reports', reportsRouter)
router.use('/tax-rates', taxRatesRouter)

export default router
