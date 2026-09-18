import { Router } from 'express'

import billing from '../routes/billing.js'
import api_credentials from './api-credentials.js'
import auth from './auth.js'
import custom_rules from './custom-rules.js'
import notifications from './notifications.js'
import pull_requests from './pull-requests.js'
import reports from './reports.js'
import repositories from './repositories.js'
import review_queue from './review-queue.js'
import reviews from './reviews.js'
import webhook_events from './webhook-events.js'
import webhooks from './webhooks.js'

const router = Router()

router.use('/auth', auth)
router.use('/repositories', repositories)
router.use('/pull-requests', pull_requests)
router.use('/reviews', reviews)
router.use('/review-queue', review_queue)
router.use('/custom-rules', custom_rules)
router.use('/notifications', notifications)
router.use('/api-credentials', api_credentials)
router.use('/webhook-events', webhook_events)
router.use('/webhooks', webhooks)
router.use('/reports', reports)
router.use('/billing', billing)

export default router
