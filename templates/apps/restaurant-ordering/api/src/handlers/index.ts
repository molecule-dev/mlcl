import { Router } from 'express'

import analytics from './analytics.js'
import customers from './customers.js'
import emergencyContact from './emergency-contact.js'
import guest from './guest.js'
import kitchen from './kitchen.js'
import menu from './menu.js'
import notifications from './notifications.js'
import orders from './orders.js'
import reservations from './reservations.js'
import tables from './tables.js'

const router = Router()

router.use('/analytics', analytics)
router.use('/customers', customers)
router.use('/emergency-contact', emergencyContact)
router.use('/guest', guest)
router.use('/kitchen', kitchen)
router.use('/menu', menu)
router.use('/notifications', notifications)
router.use('/orders', orders)
router.use('/reservations', reservations)
router.use('/tables', tables)

export default router
