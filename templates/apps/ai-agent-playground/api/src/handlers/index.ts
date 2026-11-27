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
import apiCredentialsRouter from './api-credentials.js'
import datasetsRouter from './datasets.js'
import executionsRouter from './executions.js'
import knowledgeBasesRouter from './knowledge-bases.js'
import notificationsRouter from './notifications.js'
import toolsRouter from './tools.js'
import userPreferencesRouter from './user-preferences.js'

const router = Router()

router.use('/agents', agentsRouter)
router.use('/api-credentials', apiCredentialsRouter)
router.use('/datasets', datasetsRouter)
router.use('/executions', executionsRouter)
router.use('/knowledge-bases', knowledgeBasesRouter)
router.use('/notifications', notificationsRouter)
router.use('/tools', toolsRouter)
router.use('/user-preferences', userPreferencesRouter)

export default router
