/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 * Everything here is served under `/api`: a route the client or a suite calls at
 * `/api/users` is declared as `/users`. Do not add a prefix of your own.
 */
import { Router } from 'express'

import exercisesRouter from './exercises.js'
import measurementsRouter from './measurements.js'
import progressRouter from './progress.js'
import recordsRouter from './records.js'
import routinesRouter from './routines.js'
import settingsRouter from './settings.js'
import workoutsRouter from './workouts.js'

const router = Router()

router.use('/exercises', exercisesRouter)
router.use('/workouts', workoutsRouter)
router.use('/routines', routinesRouter)
router.use('/measurements', measurementsRouter)
router.use('/records', recordsRouter)
router.use('/progress', progressRouter)
// GET/PATCH /api/settings — server-side preferences channel. The platform
// user resource never returns `oauthData` on reads, so the Settings page and
// the weight-unit hook persist through here instead of PATCH /users/:id.
router.use('/settings', settingsRouter)

export default router
