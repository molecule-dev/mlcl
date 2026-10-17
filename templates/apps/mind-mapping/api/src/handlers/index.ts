/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 */
import { Router } from 'express'

import collaborators from './collaborators.js'
import connections from './connections.js'
import maps from './maps.js'
import nodes from './nodes.js'
import templates from './templates.js'
import versions from './versions.js'

const router = Router()

router.use('/maps', maps)
router.use('/nodes', nodes)
router.use('/connections', connections)
router.use('/versions', versions)
router.use('/collaborators', collaborators)
router.use('/templates', templates)

export default router
