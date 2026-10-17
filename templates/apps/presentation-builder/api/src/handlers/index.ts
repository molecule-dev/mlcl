/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 */
import { Router } from 'express'

import exports from './exports.js'
import presentations from './presentations.js'
import slides from './slides.js'
import themes from './themes.js'

const router = Router()

router.use(presentations)
router.use(slides)
router.use(themes)
router.use(exports)

export default router
