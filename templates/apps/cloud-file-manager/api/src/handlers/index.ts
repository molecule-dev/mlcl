import { Router } from 'express'

import activity from './activity.js'
import files from './files.js'
import folders from './folders.js'
import shares from './shares.js'
import stats from './stats.js'
import storage from './storage.js'

const router = Router()

router.use('/files', files)
router.use('/folders', folders)
router.use('/shares', shares)
router.use('/activity', activity)
router.use('/stats', stats)
router.use('/storage', storage)

export default router
