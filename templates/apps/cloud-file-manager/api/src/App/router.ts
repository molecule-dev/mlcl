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
import filesRouter from '../handlers/files.js'
import foldersRouter from '../handlers/folders.js'
import sharesRouter, { publicRouter as sharesPublicRouter } from '../handlers/shares.js'
import statsRouter from '../handlers/stats.js'
import storageRouter from '../handlers/storage.js'
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

router.use('/shares', sharesPublicRouter)
router.use('/files', filesRouter)
router.use('/folders', foldersRouter)
router.use('/shares', sharesRouter)
router.use('/billing', billingRouter)
router.use('/activity', activityRouter)
router.use('/stats', statsRouter)
router.use('/storage', storageRouter)
