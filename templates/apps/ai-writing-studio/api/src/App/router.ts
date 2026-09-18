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

import analyticsRouter from '../handlers/analytics.js'
import credentialsRouter from '../handlers/credentials.js'
import dashboardRouter from '../handlers/dashboard.js'
import documentsRouter from '../handlers/documents.js'
import generateRouter from '../handlers/generate.js'
import imagesRouter from '../handlers/images.js'
import integrationsRouter from '../handlers/integrations.js'
import preferencesRouter from '../handlers/preferences.js'
import profileRouter from '../handlers/profile.js'
import seoRouter from '../handlers/seo.js'
import templatesRouter from '../handlers/templates.js'
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

router.use('/documents', documentsRouter)
router.use('/templates', templatesRouter)
router.use('/generate', generateRouter)
router.use('/images', imagesRouter)
router.use('/credentials', credentialsRouter)
router.use('/seo', seoRouter)
router.use('/billing', billingRouter)
router.use('/dashboard', dashboardRouter)
router.use('/profile', profileRouter)
router.use('/analytics', analyticsRouter)
router.use('/integrations', integrationsRouter)
router.use('/preferences', preferencesRouter)
