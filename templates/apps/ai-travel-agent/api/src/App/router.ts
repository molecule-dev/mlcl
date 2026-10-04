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

import bookingsRouter from '../handlers/bookings.js'
import conversationsRouter from '../handlers/conversations.js'
import flightsRouter from '../handlers/flights.js'
import notificationsRouter from '../handlers/notifications.js'
import preferencesRouter from '../handlers/preferences.js'
import profileRouter from '../handlers/profile.js'
import speechRouter from '../handlers/speech.js'
import { payRouter, splitsRouter } from '../handlers/splits.js'
import testEndpoints from '../handlers/_test.js'
import tripsRouter from '../handlers/trips.js'
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
router.use('/flights', flightsRouter)
router.use('/trips', tripsRouter)
router.use('/bookings', bookingsRouter)
router.use('/splits', splitsRouter)
// Public: a pay link is the payer's only credential, so these routes need no session.
router.use('/pay', payRouter)
router.use('/notifications', notificationsRouter)
router.use('/speech', speechRouter)
router.use('/preferences', preferencesRouter)
router.use('/profile', profileRouter)
router.use('/billing', billingRouter)
// Dev-only test introspection (404 unless ENABLE_E2E_TEST_ENDPOINTS=true);
// see handlers/_test.ts. Mounted after the verifyMiddleware above so
// getUserId(res) is populated — it elevates only the CALLER's own row.
router.use('/_test', testEndpoints)
