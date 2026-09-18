import { Router } from 'express'

import billingRouter from '../routes/billing.js'
import channelsRouter from './channels.js'
import membersRouter from './members.js'
import messagesRouter from './messages.js'
import reactionsRouter from './reactions.js'
import threadsRouter from './threads.js'

const router = Router()

router.use('/channels', channelsRouter)
router.use('/messages', messagesRouter)
router.use('/threads', threadsRouter)
router.use('/reactions', reactionsRouter)
router.use('/members', membersRouter)
router.use('/billing', billingRouter)

export default router
