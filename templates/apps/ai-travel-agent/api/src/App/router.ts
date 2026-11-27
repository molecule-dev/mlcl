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

router.use(templateHandlers)
// Public: a pay link is the payer's only credential, so these routes need no session.
router.use('/billing', billingRouter)
// Dev-only test introspection (404 unless ENABLE_E2E_TEST_ENDPOINTS=true);
// see handlers/_test.ts. Mounted after the verifyMiddleware above so
// getUserId(res) is populated — it elevates only the CALLER's own row.
