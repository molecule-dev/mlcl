/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 */
import { Router } from 'express'

import billing from '../routes/billing.js'
import activities from './activities.js'
import companies from './companies.js'
import contacts from './contacts.js'
import deals from './deals.js'
import pipeline from './pipeline.js'

const router = Router()

router.use('/contacts', contacts)
router.use('/companies', companies)
router.use('/deals', deals)
router.use('/activities', activities)
router.use('/pipeline', pipeline)
router.use('/billing', billing)

export default router
