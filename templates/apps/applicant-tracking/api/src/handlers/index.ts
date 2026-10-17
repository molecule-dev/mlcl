/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 */
import { Router } from 'express'

import applications from './applications.js'
import candidates from './candidates.js'
import interviews from './interviews.js'
import jobs from './jobs.js'
import notifications from './notifications.js'
import profile from './profile.js'
import reports from './reports.js'
import scorecards from './scorecards.js'
import settings from './settings.js'

const router = Router()

router.use('/jobs', jobs)
router.use('/applications', applications)
router.use('/candidates', candidates)
router.use('/scorecards', scorecards)
router.use('/interviews', interviews)
router.use('/notifications', notifications)
router.use('/reports', reports)
router.use('/settings', settings)
router.use('/profile', profile)

export default router
