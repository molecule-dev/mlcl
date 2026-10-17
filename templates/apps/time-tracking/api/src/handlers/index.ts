/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 */
import { Router } from 'express'

import clients from './clients.js'
import entries from './entries.js'
import invoices from './invoices.js'
import projects from './projects.js'
import reports from './reports.js'

const router = Router()

router.use('/entries', entries)
router.use('/projects', projects)
router.use('/clients', clients)
router.use('/reports', reports)
router.use('/invoices', invoices)

export default router
