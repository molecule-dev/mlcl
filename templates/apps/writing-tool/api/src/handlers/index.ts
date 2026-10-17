/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 */
import { Router } from 'express'

import documents from './documents.js'
import exports from './exports.js'
import folders from './folders.js'

const router = Router()

router.use('/documents', documents)
router.use('/folders', folders)
router.use('/exports', exports)

export default router
