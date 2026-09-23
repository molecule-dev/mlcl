import { Router } from 'express'

import channels from './channels.js'
import comments from './comments.js'
import follows from './follows.js'
import library from './library.js'
import notifications from './notifications.js'
import playlists from './playlists.js'
import preferences from './preferences.js'
import studio from './studio.js'
import videos from './videos.js'

const router = Router()

router.use('/videos', videos)
router.use('/channels', channels)
router.use('/playlists', playlists)
router.use('/library', library)
router.use('/notifications', notifications)
router.use('/comments', comments)
router.use('/follows', follows)
router.use('/studio', studio)
router.use('/preferences', preferences)

export default router
