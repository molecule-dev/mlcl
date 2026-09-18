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

import commentsRouter from '../handlers/comments.js'
import documentsRouter from '../handlers/documents.js'
import notificationsRouter from '../handlers/notifications.js'
import profileRouter from '../handlers/profile.js'
import sharingRouter from '../handlers/sharing.js'
import templatesRouter from '../handlers/templates.js'
import versionsRouter from '../handlers/versions.js'
import billingRoutes from '../routes/billing.js'
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

router.use('/billing', billingRoutes)
router.use('/documents', documentsRouter)
router.use('/versions', versionsRouter)
router.use('/comments', commentsRouter)
router.use('/sharing', sharingRouter)
router.use('/templates', templatesRouter)
router.use('/notifications', notificationsRouter)
router.use('/profile', profileRouter)
