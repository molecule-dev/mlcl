import { Router } from 'express'

import bookmarks from './bookmarks.js'
import comments from './comments.js'
import links from './links.js'
import notifications from './notifications.js'
import subs from './subs.js'
import users from './users.js'
import votes from './votes.js'

const router = Router()

router.use('/links', links)
router.use('/comments', comments)
router.use('/votes', votes)
router.use('/subs', subs)
router.use('/notifications', notifications)
router.use('/bookmarks', bookmarks)
router.use('/users', users)

export default router
