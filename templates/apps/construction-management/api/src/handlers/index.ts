import { Router } from 'express'

import billing from '../routes/billing.js'
import dailyLogs from './dailyLogs.js'
import profile from './profile.js'
import projects from './projects.js'
import punchItems from './punchItems.js'
import rfis from './rfis.js'
import subcontractors from './subcontractors.js'

const router = Router()

router.use('/projects', projects)
router.use('/daily-logs', dailyLogs)
router.use('/punch-items', punchItems)
router.use('/rfis', rfis)
router.use('/subcontractors', subcontractors)
router.use('/profile', profile)
router.use('/billing', billing)

export default router
