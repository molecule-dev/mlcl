import { Router } from 'express'

import announcementsRouter from './announcements.js'
import categoriesRouter from './categories.js'
import commentsRouter from './comments.js'
import teamRouter from './team.js'

const router = Router()

router.use('/announcements', announcementsRouter)
router.use('/comments', commentsRouter)
router.use('/categories', categoriesRouter)
router.use('/team', teamRouter)

export default router
