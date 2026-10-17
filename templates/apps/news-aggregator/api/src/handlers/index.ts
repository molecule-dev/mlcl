/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 */
import { Router } from 'express'

import articles from './articles.js'
import bookmarks from './bookmarks.js'
import categories from './categories.js'
import preferences from './preferences.js'
import search from './search.js'
import sources from './sources.js'
import stories from './stories.js'
import topics from './topics.js'

const router = Router()

router.use('/articles', articles)
router.use('/stories', stories)
router.use('/sources', sources)
router.use('/categories', categories)
router.use('/topics', topics)
router.use('/bookmarks', bookmarks)
router.use('/search', search)
router.use('/preferences', preferences)

export default router
