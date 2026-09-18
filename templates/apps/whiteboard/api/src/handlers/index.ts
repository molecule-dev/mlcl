import { Router } from 'express'

import boardsRouter from './boards.js'
import collaboratorsRouter from './collaborators.js'
import elementsRouter from './elements.js'
import framesRouter from './frames.js'
import templatesRouter from './templates.js'
import versionsRouter from './versions.js'

const router = Router()

router.use('/boards', boardsRouter)
router.use('/elements', elementsRouter)
router.use('/collaborators', collaboratorsRouter)
router.use('/versions', versionsRouter)
router.use('/frames', framesRouter)
router.use('/templates', templatesRouter)

export default router
