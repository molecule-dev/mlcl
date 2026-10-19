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
import notifications from './notifications.js'
import pledges from './pledges.js'
import profiles from './profiles.js'
import tiers from './tiers.js'
import updates from './updates.js'

const router = Router()

router.use('/campaigns', campaigns)
router.use('/tiers', tiers)
router.use('/pledges', pledges)
router.use('/updates', updates)
router.use('/notifications', notifications)
router.use('/profiles', profiles)

export default router
