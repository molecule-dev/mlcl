import { Router } from 'express'

import aiSummaries from './ai-summaries.js'
import articleVersions from './article-versions.js'
import articles from './articles.js'
import attachments from './attachments.js'
import bookmarks from './bookmarks.js'
import notifications from './notifications.js'
import spaceMembers from './space-members.js'
import spaces from './spaces.js'

const router = Router()

router.use('/spaces', spaces)
router.use('/spaces/:spaceId/members', spaceMembers)
router.use('/articles', articles)
router.use('/article-versions', articleVersions)
router.use('/ai-summaries', aiSummaries)
router.use('/attachments', attachments)
router.use('/bookmarks', bookmarks)
router.use('/notifications', notifications)

export default router
