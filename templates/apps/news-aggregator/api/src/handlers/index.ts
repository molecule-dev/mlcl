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
