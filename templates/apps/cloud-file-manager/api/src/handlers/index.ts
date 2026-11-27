/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 * Everything here is served under `/api`: a route the client or a suite calls at
 * `/api/users` is declared as `/users`. Do not add a prefix of your own.
 */
import { Router } from 'express'

import activityRouter from './activity.js'
import filesRouter from './files.js'
import foldersRouter from './folders.js'
import sharesRouter, { publicRouter as sharesPublicRouter } from './shares.js'
import statsRouter from './stats.js'
import storageRouter from './storage.js'
import uploadsRouter from './uploads.js'

const router = Router()

router.use('/shares', sharesPublicRouter)
router.use('/files', filesRouter)
router.use('/folders', foldersRouter)
router.use('/shares', sharesRouter)
router.use('/activity', activityRouter)
router.use('/stats', statsRouter)
router.use('/storage', storageRouter)
router.use('/uploads', uploadsRouter)

export default router
