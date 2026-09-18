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

import documentsRouter from '../handlers/documents.js'
import notificationsRouter from '../handlers/notifications.js'
import onboardingTemplatesRouter from '../handlers/onboarding-templates.js'
import onboardingsRouter from '../handlers/onboardings.js'
import profileRouter from '../handlers/profile.js'
import tasksRouter from '../handlers/tasks.js'
import teamMembersRouter from '../handlers/team-members.js'
import timelineMilestonesRouter from '../handlers/timeline-milestones.js'
import trainingModulesRouter from '../handlers/training-modules.js'
import trainingProgressRouter from '../handlers/training-progress.js'
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

router.use('/onboardings', onboardingsRouter)
router.use('/onboarding-templates', onboardingTemplatesRouter)
router.use('/tasks', tasksRouter)
router.use('/documents', documentsRouter)
router.use('/team-members', teamMembersRouter)
router.use('/training-modules', trainingModulesRouter)
router.use('/training-progress', trainingProgressRouter)
router.use('/timeline-milestones', timelineMilestonesRouter)
router.use('/notifications', notificationsRouter)
router.use('/profile', profileRouter)
router.use('/billing', billingRouter)
