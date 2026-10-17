/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 */
import { Router } from 'express'

import agentsRouter from './agents.js'
import automationsRouter from './automations.js'
import cannedResponsesRouter from './canned-responses.js'
import contactsRouter from './contacts.js'
import conversationsRouter from './conversations.js'
import messagesRouter from './messages.js'

const router = Router()

router.use('/conversations', conversationsRouter)
router.use('/messages', messagesRouter)
router.use('/canned-responses', cannedResponsesRouter)
router.use('/agents', agentsRouter)
router.use('/contacts', contactsRouter)
router.use('/automations', automationsRouter)

export default router
