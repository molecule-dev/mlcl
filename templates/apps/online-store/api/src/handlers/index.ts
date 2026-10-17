/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 */
import { Router } from 'express'

import { requireAdmin } from '../middleware/require-admin.js'
import testEndpoints from './_test.js'
import admin from './admin.js'
import cart from './cart.js'
import newsletter from './newsletter.js'
import orders from './orders.js'
import products from './products.js'
import reviews from './reviews.js'
import settings from './settings.js'
import storefront from './storefront.js'
import wishlist from './wishlist.js'

const router = Router()

router.use('/admin', requireAdmin, admin)
router.use('/products', products)
router.use('/cart', cart)
router.use('/orders', orders)
router.use('/reviews', reviews)
router.use('/storefront', storefront)
router.use('/wishlist', wishlist)
router.use('/newsletter', newsletter)
router.use('/settings', settings)
// Dev-only test setup router (POST /api/_test/promote-admin); 404 in production
// unless ENABLE_E2E_TEST_ENDPOINTS=true. See handlers/_test.ts. Mounted last,
// after the upstream verifyMiddleware (App/router.ts mounts these handlers after
// `router.use(userAuthorization.verifyMiddleware())`) so getUserId(res) is populated.
router.use('/_test', testEndpoints)

export default router
