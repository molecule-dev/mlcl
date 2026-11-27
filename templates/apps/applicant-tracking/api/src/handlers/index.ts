/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 * Everything here is served under `/api`: a route the client or a suite calls at
 * `/api/users` is declared as `/users`. Do not add a prefix of your own.
 */
import { Router } from 'express'

import applicationsRouter from './applications.js'
import candidatesRouter from './candidates.js'
import interviewsRouter from './interviews.js'
import jobsRouter from './jobs.js'
import notificationsRouter from './notifications.js'
import profileRouter from './profile.js'
import reportsRouter from './reports.js'
import scorecardsRouter from './scorecards.js'
import settingsRouter from './settings.js'

const router = Router()

router.use('/jobs', jobsRouter)
router.use('/candidates', candidatesRouter)
router.use('/applications', applicationsRouter)
router.use('/interviews', interviewsRouter)
router.use('/scorecards', scorecardsRouter)
router.use('/notifications', notificationsRouter)
router.use('/reports', reportsRouter)
router.use('/settings', settingsRouter)
router.use('/profile', profileRouter)

export default router
