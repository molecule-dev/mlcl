import { Router } from 'express'

import auditLog from './audit-log.js'
import companySettings from './company-settings.js'
import deductions from './deductions.js'
import employees from './employees.js'
import notifications from './notifications.js'
import payRuns from './pay-runs.js'
import payStubs from './pay-stubs.js'
import reports from './reports.js'
import taxes from './taxes.js'

const router = Router()

router.use('/employees', employees)
router.use('/pay-runs', payRuns)
router.use('/pay-stubs', payStubs)
router.use('/taxes', taxes)
router.use('/reports', reports)
router.use('/deductions', deductions)
router.use('/notifications', notifications)
router.use('/audit-log', auditLog)
router.use('/company-settings', companySettings)

export default router
