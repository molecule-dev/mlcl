/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 */
import { Router } from 'express'

import billing from '../routes/billing.js'
import feed from './feed.js'
import issues from './issues.js'
import profile from './profile.js'
import settings from './settings.js'
import stats from './stats.js'
import subscribers from './subscribers.js'

const router = Router()

router.use('/issues', issues)
router.use('/subscribers', subscribers)
router.use('/stats', stats)
router.use('/settings', settings)
router.use('/feed', feed)
router.use('/billing', billing)
router.use('/', profile)

export default router
