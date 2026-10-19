/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 * Everything here is served under `/api`: a route the client or a suite calls at
 * `/api/users` is declared as `/users`. Do not add a prefix of your own.
 */
import { Router } from 'express'

import me from './me.js'
import notifications from './notifications.js'
import pages from './pages.js'
import prefs from './prefs.js'
import spaces from './spaces.js'

const router = Router()

router.use('/pages', pages)
router.use('/spaces', spaces)
router.use('/notifications', notifications)
router.use('/prefs', prefs)
router.use('/me', me)

export default router
