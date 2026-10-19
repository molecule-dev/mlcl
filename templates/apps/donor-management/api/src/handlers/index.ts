/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 * Everything here is served under `/api`: a route the client or a suite calls at
 * `/api/users` is declared as `/users`. Do not add a prefix of your own.
 */
import { Router } from 'express'

import campaigns from './campaigns.js'
import dashboard from './dashboard.js'
import donors from './donors.js'
import gifts from './gifts.js'
import receipts from './receipts.js'
import settings from './settings.js'

const router = Router()

router.use('/donors', donors)
router.use('/gifts', gifts)
router.use('/campaigns', campaigns)
router.use('/receipts', receipts)
router.use('/dashboard', dashboard)
router.use('/settings', settings)

export default router
