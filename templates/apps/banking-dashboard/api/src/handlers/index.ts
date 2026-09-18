import { Router } from 'express'

import accounts from './accounts.js'
import audit_events from './audit_events.js'
import cards from './cards.js'
import linked_accounts from './linked_accounts.js'
import notifications from './notifications.js'
import recipients from './recipients.js'
import reports from './reports.js'
import statements from './statements.js'
import transactions from './transactions.js'
import transfers from './transfers.js'
import trusted_devices from './trusted_devices.js'

const router = Router()

router.use('/accounts', accounts)
router.use('/audit_events', audit_events)
router.use('/cards', cards)
router.use('/linked_accounts', linked_accounts)
router.use('/notifications', notifications)
router.use('/recipients', recipients)
router.use('/reports', reports)
router.use('/statements', statements)
router.use('/transactions', transactions)
router.use('/transfers', transfers)
router.use('/trusted_devices', trusted_devices)

export default router
