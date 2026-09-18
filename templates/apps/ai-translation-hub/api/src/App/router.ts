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
import apiTokensRouter from '../handlers/api-tokens.js'
import glossaryRouter from '../handlers/glossary.js'
import memoryRouter from '../handlers/memory.js'
import notificationsRouter from '../handlers/notifications.js'
import projectsRouter from '../handlers/projects.js'
import reportsRouter from '../handlers/reports.js'
import segmentsRouter from '../handlers/segments.js'
import teamRouter from '../handlers/team.js'
import translationsRouter from '../handlers/translations.js'
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

router.use('/projects', projectsRouter)
router.use('/translations', translationsRouter)
router.use('/segments', segmentsRouter)
router.use('/glossary', glossaryRouter)
router.use('/memory', memoryRouter)
router.use('/team', teamRouter)
router.use('/notifications', notificationsRouter)
router.use('/api-tokens', apiTokensRouter)
router.use('/billing', billingRouter)
router.use('/activity', activityRouter)
router.use('/reports', reportsRouter)
