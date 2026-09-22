import { Router } from 'express'

import airportsRouter from './airports.js'
import alertsRouter from './alerts.js'
import bookingsRouter from './bookings.js'
import flightsRouter from './flights.js'
import notificationsRouter from './notifications.js'
import preferencesRouter from './preferences.js'
import tripsRouter from './trips.js'

const router = Router()

router.use('/flights', flightsRouter)
router.use('/airports', airportsRouter)
router.use('/alerts', alertsRouter)
router.use('/trips', tripsRouter)
router.use('/bookings', bookingsRouter)
router.use('/notifications', notificationsRouter)
router.use('/preferences', preferencesRouter)

export default router
