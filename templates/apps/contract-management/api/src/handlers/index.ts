import { Router } from 'express'

import billing from '../routes/billing.js'
import contracts from './contracts.js'
import counterparties from './counterparties.js'
import notifications from './notifications.js'
import profile from './profile.js'
import reports from './reports.js'
import signatures from './signatures.js'
import templates from './templates.js'

const router = Router()

router.use('/contracts', contracts)
router.use('/templates', templates)
router.use('/signatures', signatures)
router.use('/counterparties', counterparties)
router.use('/notifications', notifications)
router.use('/reports', reports)
router.use('/billing', billing)
router.use('/profile', profile)

export default router
