/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 * Everything here is served under `/api`: a route the client or a suite calls at
 * `/api/users` is declared as `/users`. Do not add a prefix of your own.
 */
import { Router } from 'express'

import bookmarks from './bookmarks.js'
import categories from './categories.js'
import moderation from './moderation.js'
import notifications from './notifications.js'
import preferences from './preferences.js'
import profiles from './profiles.js'
import threads from './threads.js'
import votes from './votes.js'

const router = Router()

router.use('/threads', threads)
router.use('/categories', categories)
router.use('/votes', votes)
router.use('/moderation', moderation)
router.use('/profiles', profiles)
router.use('/notifications', notifications)
router.use('/bookmarks', bookmarks)
router.use('/preferences', preferences)

export default router
