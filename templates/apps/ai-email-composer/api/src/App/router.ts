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

import contactsRouter from '../handlers/contacts.js'
import draftsRouter from '../handlers/drafts.js'
import sentEmailsRouter from '../handlers/sentEmails.js'
import templatesRouter from '../handlers/templates.js'
import webhooksRouter from '../handlers/webhooks.js'
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

router.use('/drafts', draftsRouter)
router.use('/templates', templatesRouter)
router.use('/sent-emails', sentEmailsRouter)
router.use('/contacts', contactsRouter)
router.use('/webhooks', webhooksRouter)
router.use('/billing', billingRouter)
