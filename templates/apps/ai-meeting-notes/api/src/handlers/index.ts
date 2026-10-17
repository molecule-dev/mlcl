/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 */
import { Router } from 'express'

import actionItems from './action_items.js'
import apiTokens from './api_tokens.js'
import calendarEvents from './calendar_events.js'
import meetings from './meetings.js'
import notifications from './notifications.js'
import search from './search.js'
import team from './team.js'
import transcriptSegments from './transcript_segments.js'

const router = Router()

router.use('/meetings', meetings)
router.use('/transcript-segments', transcriptSegments)
router.use('/transcript_segments', transcriptSegments)
router.use('/action-items', actionItems)
router.use('/action_items', actionItems)
router.use('/calendar-events', calendarEvents)
router.use('/calendar_events', calendarEvents)
router.use('/team-members', team)
router.use('/team', team)
router.use('/notifications', notifications)
router.use('/search', search)
router.use('/api-tokens', apiTokens)
router.use('/api_tokens', apiTokens)

export default router
