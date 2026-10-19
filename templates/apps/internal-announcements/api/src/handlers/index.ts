/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 * Everything here is served under `/api`: a route the client or a suite calls at
 * `/api/users` is declared as `/users`. Do not add a prefix of your own.
 */
import { Router } from 'express'

import announcementsRouter from './announcements.js'
import categoriesRouter from './categories.js'
import commentsRouter from './comments.js'
import teamRouter from './team.js'

const router = Router()

router.use('/announcements', announcementsRouter)
router.use('/comments', commentsRouter)
router.use('/categories', categoriesRouter)
router.use('/team', teamRouter)

export default router
