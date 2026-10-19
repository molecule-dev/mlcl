/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 * Everything here is served under `/api`: a route the client or a suite calls at
 * `/api/users` is declared as `/users`. Do not add a prefix of your own.
 */
import { Router } from 'express'

import achievements from './achievements.js'
import entries from './entries.js'
import freezes from './freezes.js'
import habits from './habits.js'
import notifications from './notifications.js'
import profile from './profile.js'
import reminders from './reminders.js'
import reports from './reports.js'
import stats from './stats.js'

const router = Router()

router.use('/habits', habits)
router.use('/entries', entries)
// `/api/completions` is the dashboard/detail-page-friendly alias for entries —
// the same handler powers both. Kept so frontend code paths that read
// "completions" don't break when wired later.
router.use('/completions', entries)
router.use('/freezes', freezes)
router.use('/achievements', achievements)
router.use('/reminders', reminders)
router.use('/notifications', notifications)
router.use('/profile', profile)
router.use('/reports', reports)
router.use('/stats', stats)

export default router
