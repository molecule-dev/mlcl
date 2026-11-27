/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 * Everything here is served under `/api`: a route the client or a suite calls at
 * `/api/users` is declared as `/users`. Do not add a prefix of your own.
 */
import { Router } from 'express'

import agentsRouter from './agents.js'
import conversationsRouter from './conversations.js'
import preferencesRouter from './preferences.js'
import profileRouter from './profile.js'
import speechRouter from './speech.js'

const router = Router()

router.use('/agents', agentsRouter)
router.use('/conversations', conversationsRouter)
router.use('/speech', speechRouter)
router.use('/preferences', preferencesRouter)
router.use('/profile', profileRouter)

export default router
