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

import clientsRouter from '../handlers/clients.js'
import dashboardRouter from '../handlers/dashboard.js'
import exportsRouter from '../handlers/exports.js'
import invoicesRouter from '../handlers/invoices.js'
import notificationsRouter from '../handlers/notifications.js'
import paymentsRouter from '../handlers/payments.js'
import profileRouter from '../handlers/profile.js'
import recurringRouter from '../handlers/recurring.js'
import reportsRouter from '../handlers/reports.js'
import taxRatesRouter from '../handlers/tax-rates.js'
import billingRoutes from '../routes/billing.js'
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

router.use('/billing', billingRoutes)
router.use('/clients', clientsRouter)
router.use('/dashboard', dashboardRouter)
router.use('/exports', exportsRouter)
router.use('/invoices', invoicesRouter)
router.use('/notifications', notificationsRouter)
router.use('/payments', paymentsRouter)
router.use('/profile', profileRouter)
router.use('/recurring', recurringRouter)
router.use('/reports', reportsRouter)
router.use('/tax-rates', taxRatesRouter)
