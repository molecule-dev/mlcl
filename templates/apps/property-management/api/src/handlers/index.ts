import { Router } from 'express'

import dashboardRouter from './dashboard.js'
import financesRouter from './finances.js'
import leasesRouter from './leases.js'
import maintenanceRouter from './maintenance.js'
import notificationsRouter from './notifications.js'
import paymentsRouter from './payments.js'
import propertiesRouter from './properties.js'
import reportsRouter from './reports.js'
import tenantsRouter from './tenants.js'
import unitsRouter from './units.js'

const router = Router()

router.use('/properties', propertiesRouter)
router.use('/units', unitsRouter)
router.use('/tenants', tenantsRouter)
router.use('/leases', leasesRouter)
router.use('/maintenance', maintenanceRouter)
router.use('/payments', paymentsRouter)
router.use('/dashboard', dashboardRouter)
router.use('/finances', financesRouter)
router.use('/reports', reportsRouter)
router.use('/notifications', notificationsRouter)

export default router
