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
import comments from './comments.js'
import links from './links.js'
import notifications from './notifications.js'
import subs from './subs.js'
import users from './users.js'
import votes from './votes.js'

const router = Router()

router.use('/links', links)
router.use('/comments', comments)
router.use('/votes', votes)
router.use('/subs', subs)
router.use('/notifications', notifications)
router.use('/bookmarks', bookmarks)
router.use('/users', users)

export default router
