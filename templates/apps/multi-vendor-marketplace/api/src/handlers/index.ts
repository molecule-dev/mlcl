/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 */
import { Router } from 'express'

import cart from './cart.js'
import commissions from './commissions.js'
import notifications from './notifications.js'
import orders from './orders.js'
import products from './products.js'
import profile from './profile.js'
import reviews from './reviews.js'
import storefront from './storefront.js'
import vendors from './vendors.js'

const router = Router()

router.use('/vendors', vendors)
router.use('/products', products)
router.use('/orders', orders)
router.use('/reviews', reviews)
router.use('/commissions', commissions)
router.use('/storefront', storefront)
router.use('/cart', cart)
router.use('/notifications', notifications)
router.use('/profile', profile)

export default router
