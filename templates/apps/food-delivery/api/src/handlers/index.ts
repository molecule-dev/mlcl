import { Router } from 'express'

import addresses from './addresses.js'
import delivery from './delivery.js'
import favorites from './favorites.js'
import menu from './menu.js'
import notifications from './notifications.js'
import orders from './orders.js'
import payment_methods from './payment-methods.js'
import restaurants from './restaurants.js'
import settings from './settings.js'

const router = Router()

router.use('/restaurants', restaurants)
router.use('/menu', menu)
router.use('/orders', orders)
router.use('/delivery', delivery)
router.use('/favorites', favorites)
router.use('/notifications', notifications)
router.use('/addresses', addresses)
router.use('/payment-methods', payment_methods)
router.use('/settings', settings)

export default router
