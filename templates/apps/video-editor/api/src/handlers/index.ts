/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 * Everything here is served under `/api`: a route the client or a suite calls at
 * `/api/users` is declared as `/users`. Do not add a prefix of your own.
 */
import { Router } from 'express'

import assetsRouter from './assets.js'
import clipsRouter from './clips.js'
import effectsRouter from './effects.js'
import exportsRouter from './exports.js'
import projectsRouter from './projects.js'
import templatesRouter from './templates.js'
import timelineRouter from './timeline.js'

const router = Router()

router.use('/projects', projectsRouter)
router.use('/clips', clipsRouter)
router.use('/timeline', timelineRouter)
router.use('/exports', exportsRouter)
router.use('/assets', assetsRouter)
router.use('/templates', templatesRouter)
router.use('/effects', effectsRouter)

export default router
