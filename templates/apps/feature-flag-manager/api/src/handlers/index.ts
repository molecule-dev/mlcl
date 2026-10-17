/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 */
import { Router } from 'express'

import auditLog from './audit-log.js'
import environments from './environments.js'
import flags from './flags.js'
import seed from './seed.js'
import segments from './segments.js'
import settings from './settings.js'

const router = Router()

router.use('/flags', flags)
router.use('/environments', environments)
router.use('/segments', segments)
router.use('/audit-log', auditLog)
router.use('/seed', seed)
router.use('/settings', settings)

export default router
