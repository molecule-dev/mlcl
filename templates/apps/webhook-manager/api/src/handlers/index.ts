import { Router } from 'express'

import api_keys from './api_keys.js'
import audit_events from './audit_events.js'
import deliveries from './deliveries.js'
import events from './events.js'
import notifications from './notifications.js'
import profile from './profile.js'
import team_members from './team_members.js'
import webhooks from './webhooks.js'

const router = Router()

router.use('/api_keys', api_keys)
router.use('/audit_events', audit_events)
router.use('/deliveries', deliveries)
router.use('/events', events)
router.use('/notifications', notifications)
router.use('/profile', profile)
router.use('/team_members', team_members)
router.use('/webhooks', webhooks)

export default router
