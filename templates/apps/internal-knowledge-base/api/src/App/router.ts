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
import usersTwoFactor from '../handlers/users-2fa.js'
import billingRoutes from '../routes/billing.js'
import { requestHandlerMap as Device } from './Resource/Device/index.js'
import {
  authorization as userAuthorization,
  requestHandlerMap as User,
} from './Resource/User/index.js'

export const router = Router()

router.use(userAuthorization.verifyMiddleware())

// App-specific self-service two-factor preference toggle. Mounted before the
// default user CRUD routes so the narrow `/users/me/two-factor` route is owned
// by the app (the platform's generic PATCH /users/:id deliberately refuses to
// write twoFactorEnabled). See handlers/users-2fa.ts.
router.use('/users', usersTwoFactor)

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

router.use(templateHandlers)
router.use('/billing', billingRoutes)
