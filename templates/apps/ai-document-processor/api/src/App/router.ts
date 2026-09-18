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

import apiTokensRouter from '../handlers/api-tokens.js'
import documentsRouter from '../handlers/documents.js'
import extractionRulesRouter from '../handlers/extraction-rules.js'
import extractionTemplatesRouter from '../handlers/extraction-templates.js'
import foldersRouter from '../handlers/folders.js'
import integrationsRouter from '../handlers/integrations.js'
import processingRouter from '../handlers/processing.js'
import reportsRouter from '../handlers/reports.js'
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
router.use('/folders', foldersRouter)
router.use('/extraction-rules', extractionRulesRouter)
router.use('/extraction-templates', extractionTemplatesRouter)
router.use('/api-tokens', apiTokensRouter)
router.use('/processing', processingRouter)
router.use('/integrations', integrationsRouter)
router.use('/reports', reportsRouter)
router.use('/billing', billingRouter)
