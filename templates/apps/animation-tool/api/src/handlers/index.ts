/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 */
import { Router } from 'express'

import billing from '../routes/billing.js'
import activityRouter from './activity.js'
import assetsRouter from './assets.js'
import exportsRouter from './exports.js'
import keyframesRouter from './keyframes.js'
import layersRouter from './layers.js'
import libraryRouter from './library.js'
import projectsRouter from './projects.js'
import statesRouter from './states.js'

const router = Router()

router.use('/activity', activityRouter)
router.use('/assets', assetsRouter)
router.use('/projects', projectsRouter)
router.use('/keyframes', keyframesRouter)
router.use('/layers', layersRouter)
router.use('/library', libraryRouter)
router.use('/states', statesRouter)
router.use('/exports', exportsRouter)
router.use('/billing', billing)

export default router
