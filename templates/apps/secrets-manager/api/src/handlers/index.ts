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
