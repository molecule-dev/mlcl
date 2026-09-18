import { Router } from 'express'

import exercisesRouter from './exercises.js'
import measurementsRouter from './measurements.js'
import progressRouter from './progress.js'
import recordsRouter from './records.js'
import routinesRouter from './routines.js'
import workoutsRouter from './workouts.js'

const router = Router()

router.use('/exercises', exercisesRouter)
router.use('/workouts', workoutsRouter)
router.use('/routines', routinesRouter)
router.use('/measurements', measurementsRouter)
router.use('/records', recordsRouter)
router.use('/progress', progressRouter)

export default router
