import { Router } from 'express'

import {
  mountDefaultDeviceRoutes,
  mountDefaultUserAuthRoutes,
  mountDefaultUserBillingRoutes,
  mountDefaultUserCrudRoutes,
  mountDefaultUserResetPasswordRoute,
  mountDefaultUserSecurityRoutes,
} from '@molecule/api-bonds-default-express'

import accountsRouter from '../handlers/accounts.js'
import budgetsRouter from '../handlers/budgets.js'
import categoriesRouter from '../handlers/categories.js'
import goalsRouter from '../handlers/goals.js'
import notificationsRouter from '../handlers/notifications.js'
import reportsRouter from '../handlers/reports.js'
import transactionsRouter from '../handlers/transactions.js'
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

router.use('/accounts', accountsRouter)
router.use('/transactions', transactionsRouter)
router.use('/budgets', budgetsRouter)
router.use('/goals', goalsRouter)
router.use('/categories', categoriesRouter)
router.use('/reports', reportsRouter)
router.use('/notifications', notificationsRouter)
router.use('/billing', billingRouter)
