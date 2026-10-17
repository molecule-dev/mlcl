/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 */
import { Router } from 'express'

import analyticsRouter from './analytics.js'
import commentsRouter from './comments.js'
import foldersRouter from './folders.js'
import notificationsRouter from './notifications.js'
import recordingsRouter from './recordings.js'
import settingsRouter from './settings.js'
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
router.use('/settings', settingsRouter)

export default router
