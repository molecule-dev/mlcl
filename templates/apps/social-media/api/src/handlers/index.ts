import { Router } from 'express'

import feed from './feed.js'
import follows from './follows.js'
import messages from './messages.js'
import moderation from './moderation.js'
import notifications from './notifications.js'
import posts from './posts.js'
import preferences from './preferences.js'
import stories from './stories.js'
import { profile, saves, search } from './users.js'

const router = Router()

router.use('/posts', posts)
router.use('/feed', feed)
router.use('/stories', stories)
router.use('/follows', follows)
router.use('/notifications', notifications)
router.use('/messages', messages)
router.use('/moderation', moderation)
router.use('/profile', profile)
router.use('/search', search)
router.use('/preferences', preferences)
router.use(saves)

export default router
