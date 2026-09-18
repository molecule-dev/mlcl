import { Router } from 'express'

import billing from '../routes/billing.js'
import apiTokens from './api-tokens.js'
import auditLog from './audit-log.js'
import moderation from './moderation.js'
import notifications from './notifications.js'
import rules from './rules.js'

const router = Router()

router.use('/moderation', moderation)
router.use('/rules', rules)
router.use('/notifications', notifications)
router.use('/api-tokens', apiTokens)
router.use('/audit-log', auditLog)
router.use('/billing', billing)

export default router
