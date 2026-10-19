/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 * Everything here is served under `/api`: a route the client or a suite calls at
 * `/api/users` is declared as `/users`. Do not add a prefix of your own.
 */
import { Router } from 'express'

import accessPolicies from './access-policies.js'
import apiTokens from './api-tokens.js'
import auditLog from './audit-log.js'
import integrations from './integrations.js'
import notifications from './notifications.js'
import rotations from './rotations.js'
import secrets from './secrets.js'
import settings from './settings.js'
import teamMembers from './team-members.js'
import vaults from './vaults.js'

const router = Router()

router.use(accessPolicies)
router.use(apiTokens)
router.use(auditLog)
router.use(integrations)
router.use(notifications)
router.use(rotations)
router.use(secrets)
router.use('/settings', settings)
router.use(teamMembers)
router.use(vaults)

export default router
