/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 * Everything here is served under `/api`: a route the client or a suite calls at
 * `/api/users` is declared as `/users`. Do not add a prefix of your own.
 */
import { Router } from 'express'

import connections from './connections.js'
import dashboard from './dashboard.js'
import notifications from './notifications.js'
import runs from './runs.js'
import templates from './templates.js'
import workflows from './workflows.js'

const router = Router()

router.use('/workflows', workflows)
router.use('/runs', runs)
router.use('/templates', templates)
router.use('/connections', connections)
router.use('/notifications', notifications)
router.use('/dashboard', dashboard)

export default router
