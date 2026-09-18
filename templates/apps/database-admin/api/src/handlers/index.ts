import { Router } from 'express'

import connections from './connections.js'
import queries from './queries.js'
import schema from './schema.js'

const router = Router()

router.use('/schema', schema)
router.use('/queries', queries)
router.use('/connections', connections)

export default router
