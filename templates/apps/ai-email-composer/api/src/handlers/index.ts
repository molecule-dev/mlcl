/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 * Everything here is served under `/api`: a route the client or a suite calls at
 * `/api/users` is declared as `/users`. Do not add a prefix of your own.
 */
import { Router } from 'express'

import contactsRouter from './contacts.js'
import draftsRouter from './drafts.js'
import sentEmailsRouter from './sentEmails.js'
import templatesRouter from './templates.js'
import webhooksRouter from './webhooks.js'

const router = Router()

router.use('/drafts', draftsRouter)
router.use('/templates', templatesRouter)
router.use('/sent-emails', sentEmailsRouter)
router.use('/contacts', contactsRouter)
router.use('/webhooks', webhooksRouter)

export default router
