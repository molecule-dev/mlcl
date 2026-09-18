import { Router } from 'express'

import analyticsRouter from './analytics.js'
import commentsRouter from './comments.js'
import foldersRouter from './folders.js'
import notificationsRouter from './notifications.js'
import recordingsRouter from './recordings.js'
import shareLinksRouter from './share-links.js'
import viewsRouter from './views.js'
import workspaceMembersRouter from './workspace-members.js'
import workspacesRouter from './workspaces.js'

const router = Router()

router.use('/recordings', recordingsRouter)
router.use('/views', viewsRouter)
router.use('/comments', commentsRouter)
router.use('/folders', foldersRouter)
router.use('/share-links', shareLinksRouter)
router.use('/workspaces', workspacesRouter)
router.use('/workspace-members', workspaceMembersRouter)
router.use('/notifications', notificationsRouter)
router.use('/analytics', analyticsRouter)

export default router
