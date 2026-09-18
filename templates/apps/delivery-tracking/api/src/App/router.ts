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

import testEndpoints from '../handlers/_test.js'
import alertsRouter from '../handlers/alerts.js'
import carriersRouter from '../handlers/carriers.js'
import eventsRouter from '../handlers/events.js'
import notificationsRouter from '../handlers/notifications.js'
import reportsRouter from '../handlers/reports.js'
import settingsRouter from '../handlers/settings.js'
import shipmentsRouter from '../handlers/shipments.js'
import teamRouter from '../handlers/team.js'
import trackingRouter from '../handlers/tracking.js'
import webhookEventsRouter from '../handlers/webhook-events.js'
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

router.use('/shipments', shipmentsRouter)
router.use('/tracking', trackingRouter)
router.use('/carriers', carriersRouter)
router.use('/notifications', notificationsRouter)
router.use('/alerts', alertsRouter)
router.use('/webhooks', webhooksRouter)
router.use('/webhook-events', webhookEventsRouter)
router.use('/team', teamRouter)
router.use('/team-members', teamRouter)
router.use('/events', eventsRouter)
router.use('/reports', reportsRouter)
router.use('/settings', settingsRouter)
router.use('/billing', billingRouter)
// Dev-only test introspection (404 in production); see handlers/_test.ts.
router.use('/_test', testEndpoints)
