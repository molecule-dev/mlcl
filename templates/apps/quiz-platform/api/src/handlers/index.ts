/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 */
import { Router } from 'express'

import leaderboardRouter from './leaderboard.js'
import notificationsRouter from './notifications.js'
import questionsRouter from './questions.js'
import quizzesRouter from './quizzes.js'
import sessionsRouter from './sessions.js'
const router = Router()

router.use('/quizzes', quizzesRouter)
router.use('/questions', questionsRouter)
router.use('/sessions', sessionsRouter)
router.use('/leaderboard', leaderboardRouter)
router.use('/notifications', notificationsRouter)
export default router
