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

import actionItemsRouter from '../handlers/action_items.js'
import apiTokensRouter from '../handlers/api_tokens.js'
import calendarEventsRouter from '../handlers/calendar_events.js'
import meetingsRouter from '../handlers/meetings.js'
import notificationsRouter from '../handlers/notifications.js'
import searchRouter from '../handlers/search.js'
import settingsRouter from '../handlers/settings.js'
import teamRouter from '../handlers/team.js'
import transcriptSegmentsRouter from '../handlers/transcript_segments.js'
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

router.use('/meetings', meetingsRouter)
router.use('/transcript-segments', transcriptSegmentsRouter)
router.use('/transcript_segments', transcriptSegmentsRouter)
router.use('/action-items', actionItemsRouter)
router.use('/action_items', actionItemsRouter)
router.use('/calendar-events', calendarEventsRouter)
router.use('/calendar_events', calendarEventsRouter)
router.use('/team-members', teamRouter)
router.use('/team', teamRouter)
router.use('/notifications', notificationsRouter)
router.use('/search', searchRouter)
router.use('/settings', settingsRouter)
router.use('/api-tokens', apiTokensRouter)
router.use('/api_tokens', apiTokensRouter)
router.use('/billing', billingRouter)
