/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 */
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
