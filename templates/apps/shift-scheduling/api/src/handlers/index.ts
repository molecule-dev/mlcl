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
import availabilities from './availabilities.js'
import claims from './claims.js'
import dashboard from './dashboard.js'
import openShifts from './open-shifts.js'
import profile from './profile.js'
import resetPassword from './reset-password.js'
import shifts from './shifts.js'
import staff from './staff.js'
import swapRequests from './swap-requests.js'
import timesheets from './timesheets.js'

const router = Router()

router.use('/staff', staff)
router.use('/shifts', shifts)
router.use('/open-shifts', openShifts)
router.use('/claims', claims)
router.use('/swap-requests', swapRequests)
router.use('/availabilities', availabilities)
router.use('/timesheets', timesheets)
router.use('/dashboard-stats', dashboard)
router.use('/audit', audit)
router.use('/profile', profile)
router.use('/users/reset-password', resetPassword)

export default router
