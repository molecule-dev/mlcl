import { Router } from 'express'

import {
  mountDefaultDeviceRoutes,
  mountDefaultUserAuthRoutes,
  mountDefaultUserBillingRoutes,
  mountDefaultUserCrudRoutes,
  mountDefaultUserResetPasswordRoute,
  mountDefaultUserSecurityRoutes,
} from '@molecule/api-bonds-default-express'

import activitiesRouter from '../handlers/activities.js'
import collaboratorsRouter from '../handlers/collaborators.js'
import commentsRouter from '../handlers/comments.js'
import designTokensRouter from '../handlers/design_tokens.js'
import exportsRouter from '../handlers/exports.js'
import layersRouter from '../handlers/layers.js'
import notificationsRouter from '../handlers/notifications.js'
import profileRouter from '../handlers/profile.js'
import projectsRouter from '../handlers/projects.js'
import searchRouter from '../handlers/search.js'
import shapesRouter from '../handlers/shapes.js'
import teamRouter from '../handlers/team.js'
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

router.use('/projects', projectsRouter)
router.use('/projects/:projectId/collaborators', collaboratorsRouter)
router.use('/layers', layersRouter)
router.use('/shapes', shapesRouter)
router.use('/exports', exportsRouter)
router.use('/templates', templatesRouter)
router.use('/comments', commentsRouter)
router.use('/activities', activitiesRouter)
router.use('/billing', billingRouter)
router.use('/notifications', notificationsRouter)
router.use('/profile', profileRouter)
router.use('/team', teamRouter)
router.use('/search', searchRouter)
router.use('/design_tokens', designTokensRouter)
