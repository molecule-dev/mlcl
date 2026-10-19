/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 * Everything here is served under `/api`: a route the client or a suite calls at
 * `/api/users` is declared as `/users`. Do not add a prefix of your own.
 */
import { Router } from 'express'

import analytics from './analytics.js'
import checkout from './checkout.js'
import downloads from './downloads.js'
import library from './library.js'
import licenses from './licenses.js'
import orders from './orders.js'
import products from './products.js'
import profile from './profile.js'
import purchases from './purchases.js'
import sales from './sales.js'

const router = Router()

router.use('/products', products)
router.use('/purchases', purchases)
router.use('/licenses', licenses)
router.use('/downloads', downloads)
router.use('/analytics', analytics)
router.use('/library', library)
router.use('/orders', orders)
router.use('/sales', sales)
router.use('/checkout', checkout)
router.use('/profile', profile)

export default router
