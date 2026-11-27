/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 * Everything here is served under `/api`: a route the client or a suite calls at
 * `/api/users` is declared as `/users`. Do not add a prefix of your own.
 */
import { Router } from 'express'

import albums from './albums.js'
import galleries from './galleries.js'
import photos from './photos.js'
import preferences from './preferences.js'
import profiles from './profiles.js'
import { photoFilesRouter, uploadsRouter } from './uploads.js'

const router = Router()

router.use('/photos', photos)
router.use('/albums', albums)
router.use('/profiles', profiles)
router.use('/galleries', galleries)
router.use('/preferences', preferences)
// Public, so <img src> loads work for unauthenticated viewers (e.g. landing).
router.use('/photo-files', photoFilesRouter)
router.use('/photo-uploads', uploadsRouter)

export default router
