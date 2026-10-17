/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 */
import { Router } from 'express'

import adjustments from './adjustments.js'
import albums from './albums.js'
import exportsHandler from './exports.js'
import filters from './filters.js'
import images from './images.js'
import layers from './layers.js'

const router = Router()

router.use('/images', images)
router.use('/filters', filters)
router.use('/adjustments', adjustments)
router.use('/exports', exportsHandler)
router.use('/albums', albums)
router.use('/layers', layers)

export default router
