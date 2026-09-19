import { Router } from 'express'

import leaderboardRouter from './leaderboard.js'
import puzzlesRouter from './puzzles.js'
import statsRouter from './stats.js'

const router = Router()

router.use('/puzzles', puzzlesRouter)
router.use('/stats', statsRouter)
router.use('/leaderboard', leaderboardRouter)

export default router
