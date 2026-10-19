/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 * Everything here is served under `/api`: a route the client or a suite calls at
 * `/api/users` is declared as `/users`. Do not add a prefix of your own.
 */
import { Router } from 'express'

import cart from './cart.js'
import deliverySlots from './delivery-slots.js'
import lists from './lists.js'
import orders from './orders.js'
import products from './products.js'

const router = Router()

router.use('/products', products)
router.use('/cart', cart)
router.use('/orders', orders)
router.use('/delivery-slots', deliverySlots)
router.use('/lists', lists)

export default router
