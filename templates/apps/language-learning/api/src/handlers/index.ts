/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 * Everything here is served under `/api`: a route the client or a suite calls at
 * `/api/users` is declared as `/users`. Do not add a prefix of your own.
 */
import { Router } from 'express'

import coursesRouter from './courses.js'
import dashboardRouter from './dashboard.js'
import exercisesRouter from './exercises.js'
import leaderboardRouter from './leaderboard.js'
import lessonsRouter from './lessons.js'
import practiceRouter from './practice.js'
import preferencesRouter from './preferences.js'
import progressRouter from './progress.js'
import vocabularyRouter from './vocabulary.js'

const router = Router()

router.use('/courses', coursesRouter)
router.use('/lessons', lessonsRouter)
router.use('/exercises', exercisesRouter)
// `/api/progress` carries both the per-user progress endpoints and the
// dashboard-summary aggregator, so /api/progress/user/me/summary works
// alongside /api/progress/user/:userId/{xp,streak,complete-lesson}.
router.use('/progress', dashboardRouter)
router.use('/progress', progressRouter)
router.use('/leaderboard', leaderboardRouter)
router.use('/vocabulary', vocabularyRouter)
router.use('/practice', practiceRouter)
router.use('/users/me/preferences', preferencesRouter)

export default router
