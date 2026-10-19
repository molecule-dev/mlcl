/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 * Everything here is served under `/api`: a route the client or a suite calls at
 * `/api/users` is declared as `/users`. Do not add a prefix of your own.
 */
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
