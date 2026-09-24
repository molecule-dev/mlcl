import { Router } from 'express'

import bookmarks from './bookmarks.js'
import categories from './categories.js'
import moderation from './moderation.js'
import notifications from './notifications.js'
import preferences from './preferences.js'
import profiles from './profiles.js'
import threads from './threads.js'
import votes from './votes.js'

const router = Router()

router.use('/threads', threads)
router.use('/categories', categories)
router.use('/votes', votes)
router.use('/moderation', moderation)
router.use('/profiles', profiles)
router.use('/notifications', notifications)
router.use('/bookmarks', bookmarks)
router.use('/preferences', preferences)

export default router
