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
import billingRoutes from '../routes/billing.js'
import { requestHandlerMap as Device } from './Resource/Device/index.js'
import {
  authorization as userAuthorization,
  requestHandlerMap as User,
} from './Resource/User/index.js'

export const router = Router()

router.use(userAuthorization.verifyMiddleware())

// IMPORTANT: template handlers must mount BEFORE the default device
// routes because this app owns the `/devices` URL space for IoT devices
// (iot_devices table). The molecule built-in `mountDefaultDeviceRoutes`
// also wires `/devices` for end-user push/notification devices — if it
// registered first, Express would match its handlers and the IoT routes
// would never run, returning user-device rows (name="Unknown", with
// pushPlatform/pushSubscription fields) to every consumer.
router.use(templateHandlers)
router.use('/billing', billingRoutes)

mountDefaultDeviceRoutes(router, Device)
mountDefaultUserAuthRoutes(router, User)
mountDefaultUserResetPasswordRoute(router, User)
mountDefaultUserCrudRoutes(router, User)
mountDefaultUserSecurityRoutes(router, User)
mountDefaultUserBillingRoutes(router, User)
