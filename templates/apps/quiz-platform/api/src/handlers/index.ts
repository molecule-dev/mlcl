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
