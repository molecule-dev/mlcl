import { Router } from 'express'

import {
  mountDefaultDeviceRoutes,
  mountDefaultUserAuthRoutes,
  mountDefaultUserBillingRoutes,
  mountDefaultUserCrudRoutes,
  mountDefaultUserResetPasswordRoute,
  mountDefaultUserSecurityRoutes,
  mountDefaultUserVerifyPaymentRoutes,
} from '@molecule/api-bonds-default-express'

import agentsRouter from '../handlers/agents.js'
import automationsRouter from '../handlers/automations.js'
import cannedResponsesRouter from '../handlers/canned-responses.js'
import contactsRouter from '../handlers/contacts.js'
import conversationsRouter from '../handlers/conversations.js'
import messagesRouter from '../handlers/messages.js'
import billingRouter from '../routes/billing.js'
import { requestHandlerMap as Device } from './Resource/Device/index.js'
import {
  authorization as userAuthorization,
  requestHandlerMap as User,
} from './Resource/User/index.js'

export const router = Router()

router.use(userAuthorization.verifyMiddleware())

mountDefaultDeviceRoutes(router, Device)
mountDefaultUserAuthRoutes(router, User)
mountDefaultUserResetPasswordRoute(router, User)
mountDefaultUserCrudRoutes(router, User)
mountDefaultUserSecurityRoutes(router, User)
mountDefaultUserBillingRoutes(router, User)
mountDefaultUserVerifyPaymentRoutes(router, User)

router.use('/conversations', conversationsRouter)
router.use('/messages', messagesRouter)
router.use('/canned-responses', cannedResponsesRouter)
router.use('/agents', agentsRouter)
router.use('/contacts', contactsRouter)
router.use('/automations', automationsRouter)
router.use('/billing', billingRouter)
