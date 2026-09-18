import { Router } from 'express'

import billing from '../routes/billing.js'
import contacts from './contacts.js'
import drafts from './drafts.js'
import sentEmails from './sentEmails.js'
import templates from './templates.js'
import webhooks from './webhooks.js'

const router = Router()

router.use('/drafts', drafts)
router.use('/templates', templates)
router.use('/sent-emails', sentEmails)
router.use('/contacts', contacts)
router.use('/webhooks', webhooks)
router.use('/billing', billing)

export default router
