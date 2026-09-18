import { Router } from 'express'

import alerts from './alerts.js'
import costs from './costs.js'
import me from './me.js'
import meters from './meters.js'
import readings from './readings.js'

const router = Router()

router.use('/meters', meters)
router.use('/readings', readings)
router.use('/costs', costs)
router.use('/alerts', alerts)
router.use('/me', me)

export default router
