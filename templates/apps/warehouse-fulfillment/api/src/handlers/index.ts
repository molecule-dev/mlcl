import { Router } from 'express'

import inventory from './inventory.js'
import locations from './locations.js'
import notifications from './notifications.js'
import orders from './orders.js'
import packing from './packing.js'
import picks from './picks.js'
import preferences from './preferences.js'
import receipts from './receipts.js'
import returns from './returns.js'
import setup from './setup.js'
import shipments from './shipments.js'
import zones from './zones.js'

const router = Router()

router.use('/orders', orders)
router.use('/inventory', inventory)
router.use('/picks', picks)
router.use('/packing', packing)
router.use('/shipments', shipments)
router.use('/zones', zones)
router.use('/locations', locations)
router.use('/receipts', receipts)
router.use('/returns', returns)
router.use('/notifications', notifications)
router.use('/preferences', preferences)
router.use('/setup', setup)

export default router
