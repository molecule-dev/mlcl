import { Router } from 'express'

import alertsRouter from './alerts.js'
import arrivalsRouter from './arrivals.js'
import networkRouter from './network.js'
import savedStopsRouter from './saved-stops.js'
import tripsRouter from './trips.js'

const router = Router()

router.use('/network', networkRouter)
router.use('/arrivals', arrivalsRouter)
router.use('/trips', tripsRouter)
router.use('/alerts', alertsRouter)
router.use('/saved-stops', savedStopsRouter)

export default router
