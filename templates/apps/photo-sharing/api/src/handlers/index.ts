/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 */
import { Router } from 'express'

import albums from './albums.js'
import galleries from './galleries.js'
import photos from './photos.js'
import preferences from './preferences.js'
import profiles from './profiles.js'

const router = Router()

router.use('/photos', photos)
router.use('/albums', albums)
router.use('/profiles', profiles)
router.use('/galleries', galleries)
router.use('/preferences', preferences)

export default router
