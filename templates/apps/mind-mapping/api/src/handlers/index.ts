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
