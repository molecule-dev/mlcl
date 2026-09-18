import { Router } from 'express'

import clients from './clients.js'
import entries from './entries.js'
import invoices from './invoices.js'
import projects from './projects.js'
import reports from './reports.js'

const router = Router()

router.use('/entries', entries)
router.use('/projects', projects)
router.use('/clients', clients)
router.use('/reports', reports)
router.use('/invoices', invoices)

export default router
