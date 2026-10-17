/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 */
import { Router } from 'express'

import leaderboardRouter from './leaderboard.js'
import puzzlesRouter from './puzzles.js'
import statsRouter from './stats.js'

const router = Router()

router.use('/puzzles', puzzlesRouter)
router.use('/stats', statsRouter)
router.use('/leaderboard', leaderboardRouter)

export default router
