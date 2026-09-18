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

import agentsRouter from '../handlers/agents.js'
import apiCredentialsRouter from '../handlers/api-credentials.js'
import datasetsRouter from '../handlers/datasets.js'
import executionsRouter from '../handlers/executions.js'
import knowledgeBasesRouter from '../handlers/knowledge-bases.js'
import notificationsRouter from '../handlers/notifications.js'
import toolsRouter from '../handlers/tools.js'
import userPreferencesRouter from '../handlers/user-preferences.js'
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

router.use('/agents', agentsRouter)
router.use('/api-credentials', apiCredentialsRouter)
router.use('/datasets', datasetsRouter)
router.use('/executions', executionsRouter)
router.use('/knowledge-bases', knowledgeBasesRouter)
router.use('/notifications', notificationsRouter)
router.use('/tools', toolsRouter)
router.use('/user-preferences', userPreferencesRouter)
router.use('/billing', billingRouter)
