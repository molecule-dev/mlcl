/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 * Everything here is served under `/api`: a route the client or a suite calls at
 * `/api/users` is declared as `/users`. Do not add a prefix of your own.
 */
import { Router } from 'express'

import testEndpoints from './_test.js'
import alertsRouter from './alerts.js'
import carriersRouter from './carriers.js'
import eventsRouter from './events.js'
import notificationsRouter from './notifications.js'
import reportsRouter from './reports.js'
import settingsRouter from './settings.js'
import shipmentsRouter from './shipments.js'
import teamRouter from './team.js'
import trackingRouter from './tracking.js'
import webhookEventsRouter from './webhook-events.js'
import webhooksRouter from './webhooks.js'

const router = Router()

router.use('/shipments', shipmentsRouter)
router.use('/tracking', trackingRouter)
router.use('/carriers', carriersRouter)
router.use('/notifications', notificationsRouter)
router.use('/alerts', alertsRouter)
router.use('/webhooks', webhooksRouter)
router.use('/webhook-events', webhookEventsRouter)
router.use('/team', teamRouter)
router.use('/team-members', teamRouter)
router.use('/events', eventsRouter)
router.use('/reports', reportsRouter)
router.use('/settings', settingsRouter)
router.use('/_test', testEndpoints)

export default router
