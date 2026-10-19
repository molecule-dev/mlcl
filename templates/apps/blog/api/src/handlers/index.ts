/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 * Everything here is served under `/api`: a route the client or a suite calls at
 * `/api/users` is declared as `/users`. Do not add a prefix of your own.
 */
import { Router } from 'express'

import billing from '../routes/billing.js'
import analytics from './analytics.js'
import categories from './categories.js'
import comments from './comments.js'
import feed from './feed.js'
import interactions, { bookmarksRouter } from './interactions.js'
import notifications from './notifications.js'
import posts from './posts.js'
import profile from './profile.js'
import tags from './tags.js'

const router = Router()

router.use('/posts', interactions)
router.use('/posts', posts)
router.use('/bookmarks', bookmarksRouter)
router.use('/categories', categories)
router.use('/comments', comments)
router.use('/feed', feed)
router.use('/notifications', notifications)
router.use('/tags', tags)
router.use('/billing', billing)
router.use('/analytics', analytics)
router.use('/', profile)

export default router
