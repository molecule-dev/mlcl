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

import activityRouter from '../handlers/activity.js'
import annotationsRouter from '../handlers/annotations.js'
import authRouter from '../handlers/auth.js'
import avatarRouter from '../handlers/avatar.js'
import embedsRouter from '../handlers/embeds.js'
import modelsRouter from '../handlers/models.js'
import notificationsRouter from '../handlers/notifications.js'
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
// POST/GET /users/:id/verify-payment/:provider — what the checkout return
// page (/plan-updated) calls to actually grant the paid plan. Without this
// mount the app's own checkout success_url 404s and the purchase is never
// confirmed.
mountDefaultUserVerifyPaymentRoutes(router, User)

router.use('/users', authRouter)
router.use('/user', avatarRouter)
router.use('/models', modelsRouter)
router.use('/annotations', annotationsRouter)
router.use('/embeds', embedsRouter)
router.use('/notifications', notificationsRouter)
router.use('/activity', activityRouter)
