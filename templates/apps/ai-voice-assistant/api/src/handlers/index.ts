/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 * Everything here is served under `/api`: a route the client or a suite calls at
 * `/api/users` is declared as `/users`. Do not add a prefix of your own.
 */
import { Router } from 'express'

import billing from '../routes/billing.js'
import agents from './agents.js'
import conversations from './conversations.js'
import preferences from './preferences.js'
import profile from './profile.js'
import speech from './speech.js'

const router = Router()

router.use('/agents', agents)
router.use('/conversations', conversations)
router.use('/speech', speech)
router.use('/preferences', preferences)
router.use('/profile', profile)
router.use('/billing', billing)

export default router
