/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 */
import { Router } from 'express'

import billing from '../routes/billing.js'
import chapters from './chapters.js'
import episodes from './episodes.js'
import feed from './feed.js'
import notifications from './notifications.js'
import profile from './profile.js'
import queue from './queue.js'
import reports from './reports.js'
import saved from './saved.js'
import shows from './shows.js'
import subscriptions from './subscriptions.js'

const router = Router()

router.use('/shows', shows)
router.use('/episodes', episodes)
router.use('/chapters', chapters)
router.use('/subscriptions', subscriptions)
router.use('/queue', queue)
router.use('/saved', saved)
router.use('/notifications', notifications)
router.use('/profile', profile)
router.use('/reports', reports)
router.use('/feed', feed)
router.use('/billing', billing)

export default router
