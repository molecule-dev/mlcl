/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 * Everything here is served under `/api`: a route the client or a suite calls at
 * `/api/users` is declared as `/users`. Do not add a prefix of your own.
 */
import { Router } from 'express'

import audit from './audit.js'
import dashboard from './dashboard.js'
import departments from './departments.js'
import documents from './documents.js'
import employees from './employees.js'
import notifications from './notifications.js'
import onboarding from './onboarding.js'
import orgTree from './org-tree.js'
import performance from './performance.js'
import profile from './profile.js'
import pto from './pto.js'
import reports from './reports.js'
import resetPassword from './reset-password.js'

const router = Router()

router.use('/employees', employees)
router.use('/departments', departments)
router.use('/pto', pto)
router.use('/documents', documents)
router.use('/performance', performance)
router.use('/notifications', notifications)
router.use('/reports', reports)
router.use('/dashboard-stats', dashboard)
router.use('/audit', audit)
router.use('/org-tree', orgTree)
router.use('/onboarding', onboarding)
router.use('/profile', profile)
router.use('/users/reset-password', resetPassword)

export default router
