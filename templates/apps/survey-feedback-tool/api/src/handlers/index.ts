import { Router } from 'express'

import billing from '../routes/billing.js'
import notifications from './notifications.js'
import questions from './questions.js'
import resetPassword from './reset-password.js'
import responses from './responses.js'
import shareLinks from './share-links.js'
import surveys from './surveys.js'
import templates from './templates.js'

const router = Router()

router.use('/surveys', surveys)
router.use('/questions', questions)
router.use('/responses', responses)
router.use('/templates', templates)
router.use('/share-links', shareLinks)
router.use('/notifications', notifications)
router.use('/reset-password', resetPassword)
router.use('/billing', billing)

export default router
