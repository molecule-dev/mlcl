/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 * Everything here is served under `/api`: a route the client or a suite calls at
 * `/api/users` is declared as `/users`. Do not add a prefix of your own.
 */
import { Router } from 'express'

import billing from '../routes/billing.js'
import customers from './customers.js'
import invoices from './invoices.js'
import jobs from './jobs.js'
import notifications from './notifications.js'
import quotes from './quotes.js'
import settings from './settings.js'
import technicians from './technicians.js'

const router = Router()

router.use('/customers', customers)
router.use('/technicians', technicians)
router.use('/quotes', quotes)
router.use('/jobs', jobs)
router.use('/invoices', invoices)
router.use('/notifications', notifications)
router.use('/settings', settings)
router.use('/billing', billing)

export default router
