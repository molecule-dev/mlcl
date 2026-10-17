/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 */
import { Router } from 'express'

import billing from '../routes/billing.js'
import testEndpoints from './_test.js'
import categories from './categories.js'
import deals from './deals.js'
import merchants from './merchants.js'
import myCoupons from './my_coupons.js'
import nearbyDeals from './nearby_deals.js'
import notifications from './notifications.js'
import redemptions from './redemptions.js'
import reports from './reports.js'
import userSettings from './user_settings.js'

const router = Router()

router.use('/deals', deals)
router.use('/redemptions', redemptions)
router.use('/merchants', merchants)
router.use('/categories', categories)
router.use('/my-coupons', myCoupons)
router.use('/my_coupons', myCoupons)
router.use('/nearby-deals', nearbyDeals)
router.use('/nearby_deals', nearbyDeals)
router.use('/notifications', notifications)
router.use('/reports', reports)
router.use('/user-settings', userSettings)
router.use('/user_settings', userSettings)
router.use('/billing', billing)
// Dev-only test introspection (404 in production); see handlers/_test.ts.
router.use('/_test', testEndpoints)

export default router
