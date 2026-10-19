/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 * Everything here is served under `/api`: a route the client or a suite calls at
 * `/api/users` is declared as `/users`. Do not add a prefix of your own.
 */
import { Router } from 'express'

import bookingsRouter from './bookings.js'
import messagesRouter from './messages.js'
import reviewsRouter from './reviews.js'
import sessionsRouter from './sessions.js'
import subjectsRouter from './subjects.js'
import tutorsRouter from './tutors.js'

const router = Router()

router.use('/tutors', tutorsRouter)
router.use('/bookings', bookingsRouter)
router.use('/sessions', sessionsRouter)
router.use('/reviews', reviewsRouter)
router.use('/subjects', subjectsRouter)
router.use('/messages', messagesRouter)

export default router
