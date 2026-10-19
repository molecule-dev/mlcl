/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 * Everything here is served under `/api`: a route the client or a suite calls at
 * `/api/users` is declared as `/users`. Do not add a prefix of your own.
 */
import { Router } from 'express'

import escalationPolicies from './escalation-policies.js'
import incidents from './incidents.js'
import notifications from './notifications.js'
import overview from './overview.js'
import postmortems from './postmortems.js'
import profile from './profile.js'
import schedules from './schedules.js'
import settings from './settings.js'
import team from './team.js'

const router = Router()

router.use('/overview', overview)
router.use('/incidents', incidents)
router.use('/schedules', schedules)
router.use('/escalation-policies', escalationPolicies)
router.use('/postmortems', postmortems)
router.use('/notifications', notifications)
router.use('/profile', profile)
router.use('/team', team)
router.use('/settings', settings)

export default router
