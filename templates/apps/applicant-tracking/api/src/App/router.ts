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

import applicationsRouter from '../handlers/applications.js'
import candidatesRouter from '../handlers/candidates.js'
import interviewsRouter from '../handlers/interviews.js'
import jobsRouter from '../handlers/jobs.js'
import notificationsRouter from '../handlers/notifications.js'
import profileRouter from '../handlers/profile.js'
import reportsRouter from '../handlers/reports.js'
import scorecardsRouter from '../handlers/scorecards.js'
import settingsRouter from '../handlers/settings.js'
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

router.use('/jobs', jobsRouter)
router.use('/candidates', candidatesRouter)
router.use('/applications', applicationsRouter)
router.use('/interviews', interviewsRouter)
router.use('/scorecards', scorecardsRouter)
router.use('/notifications', notificationsRouter)
router.use('/reports', reportsRouter)
router.use('/settings', settingsRouter)
router.use('/profile', profileRouter)
router.use('/billing', billingRouter)
