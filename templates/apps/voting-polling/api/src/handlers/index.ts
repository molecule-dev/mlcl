/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 */
import { Router } from 'express'

import audienceQuestions from './audience_questions.js'
import notifications from './notifications.js'
import polls from './polls.js'
import profile from './profile.js'
import results from './results.js'
import team from './team.js'
import voters from './voters.js'
import votes from './votes.js'

const router = Router()

router.use('/polls', polls)
router.use('/votes', votes)
router.use('/results', results)
router.use('/voters', voters)
router.use('/notifications', notifications)
router.use('/audience_questions', audienceQuestions)
router.use('/team', team)
router.use('/profile', profile)
export default router
