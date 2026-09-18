import { Router } from 'express'

import connections from './connections.js'
import dashboard from './dashboard.js'
import notifications from './notifications.js'
import runs from './runs.js'
import templates from './templates.js'
import workflows from './workflows.js'

const router = Router()

router.use('/workflows', workflows)
router.use('/runs', runs)
router.use('/templates', templates)
router.use('/connections', connections)
router.use('/notifications', notifications)
router.use('/dashboard', dashboard)

export default router
