/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 * Everything here is served under `/api`: a route the client or a suite calls at
 * `/api/users` is declared as `/users`. Do not add a prefix of your own.
 */
import { Router } from 'express'

import actionItemsRouter from './action_items.js'
import apiTokensRouter from './api_tokens.js'
import calendarEventsRouter from './calendar_events.js'
import meetingsRouter from './meetings.js'
import notificationsRouter from './notifications.js'
import searchRouter from './search.js'
import settingsRouter from './settings.js'
import teamRouter from './team.js'
import transcriptSegmentsRouter from './transcript_segments.js'

const router = Router()

router.use('/meetings', meetingsRouter)
router.use('/transcript-segments', transcriptSegmentsRouter)
router.use('/transcript_segments', transcriptSegmentsRouter)
router.use('/action-items', actionItemsRouter)
router.use('/action_items', actionItemsRouter)
router.use('/calendar-events', calendarEventsRouter)
router.use('/calendar_events', calendarEventsRouter)
router.use('/team-members', teamRouter)
router.use('/team', teamRouter)
router.use('/notifications', notificationsRouter)
router.use('/search', searchRouter)
router.use('/settings', settingsRouter)
router.use('/api-tokens', apiTokensRouter)
router.use('/api_tokens', apiTokensRouter)

export default router
