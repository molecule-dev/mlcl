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
