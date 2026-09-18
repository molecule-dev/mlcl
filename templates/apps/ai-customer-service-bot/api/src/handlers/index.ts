import { Router } from 'express'

import billing from '../routes/billing.js'
import analytics from './analytics.js'
import apiTokens from './api-tokens.js'
import conversations from './conversations.js'
import escalations from './escalations.js'
import feedback from './feedback.js'
import knowledge from './knowledge.js'
import notifications from './notifications.js'
import resetPassword from './reset-password.js'
import settings from './settings.js'

const router = Router()

router.use('/users/reset-password', resetPassword)
router.use('/conversations', conversations)
router.use('/knowledge', knowledge)
router.use('/escalations', escalations)
router.use('/feedback', feedback)
router.use('/notifications', notifications)
router.use('/api-tokens', apiTokens)
router.use('/settings', settings)
router.use('/analytics', analytics)
router.use('/billing', billing)

export default router
