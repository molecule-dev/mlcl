/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 * Everything here is served under `/api`: a route the client or a suite calls at
 * `/api/users` is declared as `/users`. Do not add a prefix of your own.
 */
import { Router } from 'express'

import aiSummaries from './ai-summaries.js'
import articleVersions from './article-versions.js'
import articles from './articles.js'
import attachments from './attachments.js'
import bookmarks from './bookmarks.js'
import notifications from './notifications.js'
import spaceMembers from './space-members.js'
import spaces from './spaces.js'
import userSettings from './user-settings.js'

const router = Router()

router.use('/spaces', spaces)
router.use('/spaces/:spaceId/members', spaceMembers)
router.use('/articles', articles)
router.use('/article-versions', articleVersions)
router.use('/ai-summaries', aiSummaries)
router.use('/attachments', attachments)
router.use('/bookmarks', bookmarks)
router.use('/notifications', notifications)
router.use('/settings', userSettings)

export default router
