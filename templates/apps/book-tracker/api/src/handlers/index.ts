/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 * Everything here is served under `/api`: a route the client or a suite calls at
 * `/api/users` is declared as `/users`. Do not add a prefix of your own.
 */
import { Router } from 'express'

import books from './books.js'
import challenge from './challenge.js'
import notifications from './notifications.js'
import profile from './profile.js'
import reports from './reports.js'
import reviews from './reviews.js'
import sessions from './sessions.js'
import stats from './stats.js'

const router = Router()

router.use('/books', books)
router.use('/sessions', sessions)
router.use('/challenge', challenge)
router.use('/reviews', reviews)
router.use('/notifications', notifications)
router.use('/profile', profile)
router.use('/reports', reports)
router.use('/stats', stats)

export default router
