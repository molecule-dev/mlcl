/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 * Everything here is served under `/api`: a route the client or a suite calls at
 * `/api/users` is declared as `/users`. Do not add a prefix of your own.
 */
import { Router } from 'express'

import analysis from './analysis.js'
import apiKeys from './api_keys.js'
import datasets from './datasets.js'
import insights from './insights.js'
import notifications from './notifications.js'
import profile from './profile.js'
import queries from './queries.js'
import reports from './reports.js'
import savedReports from './saved_reports.js'
import settings from './settings.js'
import uploads from './uploads.js'

const router = Router()

router.use('/datasets', datasets)
router.use('/analysis', analysis)
router.use('/api_keys', apiKeys)
router.use('/insights', insights)
router.use('/queries', queries)
router.use('/reports', reports)
router.use('/saved_reports', savedReports)
router.use('/uploads', uploads)
router.use('/notifications', notifications)
router.use('/profile', profile)
router.use('/settings', settings)

export default router
