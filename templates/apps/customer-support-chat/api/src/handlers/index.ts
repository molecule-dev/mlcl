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
