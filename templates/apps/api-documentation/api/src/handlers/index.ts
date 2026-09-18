import { Router } from 'express'

import apiErrors from './api_errors.js'
import apiKeys from './api_keys.js'
import billing from './billing.js'
import changelog from './changelog.js'
import endpoints from './endpoints.js'
import guides from './guides.js'
import integrations from './integrations.js'
import notifications from './notifications.js'
import profile from './profile.js'
import reports from './reports.js'
import sdks from './sdks.js'
import specs from './specs.js'
import teamMembers from './team_members.js'
import tryIt from './try-it.js'
import webhooks from './webhooks.js'

const router = Router()

router.use('/specs', specs)
router.use('/endpoints', endpoints)
router.use('/try-it', tryIt)
router.use('/changelog', changelog)
router.use('/api_errors', apiErrors)
router.use('/sdks', sdks)
router.use('/api_keys', apiKeys)
router.use('/team_members', teamMembers)
router.use('/notifications', notifications)
router.use('/reports', reports)
router.use('/guides', guides)
router.use('/webhooks', webhooks)
router.use('/billing', billing)
router.use('/profile', profile)
router.use('/integrations', integrations)

export default router
