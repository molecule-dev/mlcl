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

import templateHandlers from '../handlers/index.js'
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
// The checkout-return confirmation: the provider's success_url lands on the
// APP origin, and PlanUpdated's useVerifyPaymentReturn POSTs here from that
// page (same-origin, so the session cookie applies). Without this mount the
// call 404s and a returned buyer's plan is never granted synchronously.
mountDefaultUserVerifyPaymentRoutes(router, User)

router.use(templateHandlers)
router.use('/billing', billingRoutes)
