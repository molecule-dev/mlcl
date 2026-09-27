import { Router } from 'express'

import {
  mountDefaultDeviceRoutes,
  mountDefaultUserAuthRoutes,
  mountDefaultUserBillingRoutes,
  mountDefaultUserCrudRoutes,
  mountDefaultUserResetPasswordRoute,
  mountDefaultUserSecurityRoutes,
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

// App-specific self-service two-factor enrollment (real TOTP: setup + verify,
// never a bare flag write [M-5]). Mounted before the default user CRUD routes so
// the narrow `/users/me/two-factor*` routes are owned by the app (the platform's
// generic PATCH /users/:id deliberately refuses to write twoFactorEnabled —
// see [M6-1]). See handlers/users-2fa.ts.
router.use('/users', usersTwoFactor)

mountDefaultDeviceRoutes(router, Device)
mountDefaultUserAuthRoutes(router, User)
mountDefaultUserResetPasswordRoute(router, User)
mountDefaultUserCrudRoutes(router, User)
mountDefaultUserSecurityRoutes(router, User)
mountDefaultUserBillingRoutes(router, User)

router.use(templateHandlers)
router.use('/billing', billingRoutes)
