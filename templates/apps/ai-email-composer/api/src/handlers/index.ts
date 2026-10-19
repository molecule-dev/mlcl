/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 * Everything here is served under `/api`: a route the client or a suite calls at
 * `/api/users` is declared as `/users`. Do not add a prefix of your own.
 */
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
