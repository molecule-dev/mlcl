/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 * Everything here is served under `/api`: a route the client or a suite calls at
 * `/api/users` is declared as `/users`. Do not add a prefix of your own.
 */
import { Router } from 'express'

import billingRouter from '../routes/billing.js'
import assignmentsRouter from './assignments.js'
import coursesRouter from './courses.js'
import discussionsRouter from './discussions.js'
import enrollmentsRouter from './enrollments.js'
import gradesRouter from './grades.js'
import leaderboardRouter from './leaderboard.js'
import modulesRouter from './modules.js'
import statsRouter from './stats.js'
import usersRouter from './users.js'

const router = Router()

router.use('/courses', coursesRouter)
router.use('/assignments', assignmentsRouter)
router.use('/grades', gradesRouter)
router.use('/discussions', discussionsRouter)
router.use('/enrollments', enrollmentsRouter)
router.use('/leaderboard', leaderboardRouter)
router.use('/me/stats', statsRouter)
router.use('/modules', modulesRouter)
router.use('/profile', usersRouter)
router.use('/billing', billingRouter)

export default router
