/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 */
import { Router } from 'express'

import billing from './billing.js'
import dashboard from './dashboard.js'
import decks from './decks.js'
import notifications from './notifications.js'
import profile from './profile.js'
import progress from './progress.js'
import quizzes from './quizzes.js'
import search from './search.js'
import topics from './topics.js'

const router = Router()

router.use('/topics', topics)
router.use('/quizzes', quizzes)
router.use('/decks', decks)
router.use('/notifications', notifications)
router.use('/dashboard', dashboard)
router.use('/progress', progress)
router.use('/profile', profile)
router.use('/search', search)
router.use('/billing', billing)

export default router
