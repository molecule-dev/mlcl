import { Router } from 'express'

import aliasesRouter from './aliases.js'
import bookmarksRouter from './bookmarks.js'
import categoriesRouter from './categories.js'
import moderationRouter from './moderation.js'
import notificationsRouter from './notifications.js'
import postsRouter from './posts.js'
import topicsRouter from './topics.js'

const router = Router()

// Direct resource routes — backend canonical paths.
router.use('/categories', categoriesRouter)
router.use('/topics', topicsRouter)
router.use('/posts', postsRouter)
router.use('/bookmarks', bookmarksRouter)
router.use('/moderation-reports', moderationRouter)
router.use('/notifications', notificationsRouter)

// Aliases / convenience routes used by the frontend pages — these are
// thin adapters that translate between the user-facing domain language
// (threads, bookmark toggle, search, moderation queue, user-by-username)
// and the underlying topics/posts/users tables. Keeping them here lets
// the frontend stay clean and gives clear, testable HTTP contracts.
router.use('/', aliasesRouter)

export default router
