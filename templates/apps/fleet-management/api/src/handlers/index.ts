import { Router } from 'express'

import billing from '../routes/billing.js'
import alerts from './alerts.js'
import drivers from './drivers.js'
import geofences from './geofences.js'
import maintenance from './maintenance.js'
import notifications from './notifications.js'
import reports from './reports.js'
import routes from './routes.js'
import trips from './trips.js'
import vehicles from './vehicles.js'

const router = Router()

router.use('/vehicles', vehicles)
router.use('/drivers', drivers)
router.use('/routes', routes)
router.use('/maintenance', maintenance)
router.use('/geofences', geofences)
router.use('/trips', trips)
router.use('/alerts', alerts)
router.use('/notifications', notifications)
router.use('/reports', reports)
router.use('/billing', billing)

export default router
