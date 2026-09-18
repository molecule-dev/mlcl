/**
 * Aggregated handler index — kept in sync with the per-handler mounts
 * in `App/router.ts`. Some scaffolds reach in via the dynamic-import
 * path; both surfaces wire identical sub-routes so behaviour is
 * consistent regardless of which entrypoint is used.
 */

import { Router } from 'express'

import commentsRouter from './comments.js'
import documentsRouter from './documents.js'
import notificationsRouter from './notifications.js'
import profileRouter from './profile.js'
import sharingRouter from './sharing.js'
import templatesRouter from './templates.js'
import versionsRouter from './versions.js'

const router = Router()

router.use('/documents', documentsRouter)
router.use('/versions', versionsRouter)
router.use('/comments', commentsRouter)
router.use('/sharing', sharingRouter)
router.use('/templates', templatesRouter)
router.use('/notifications', notificationsRouter)
router.use('/profile', profileRouter)

export default router
