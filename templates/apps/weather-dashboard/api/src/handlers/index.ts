import { Router } from 'express'

import alerts from './alerts.js'
import forecasts from './forecasts.js'
import history from './history.js'
import locations from './locations.js'

const router = Router()

router.use('/locations', locations)
router.use('/forecasts', forecasts)
router.use('/alerts', alerts)
router.use('/history', history)

export default router
