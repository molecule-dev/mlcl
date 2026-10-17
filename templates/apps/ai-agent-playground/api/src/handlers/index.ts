/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 */
import { Router } from 'express'

import agents from './agents.js'
import apiCredentials from './api-credentials.js'
import datasets from './datasets.js'
import executions from './executions.js'
import knowledgeBases from './knowledge-bases.js'
import notifications from './notifications.js'
import tools from './tools.js'
import userPreferences from './user-preferences.js'

const router = Router()

router.use('/agents', agents)
router.use('/api-credentials', apiCredentials)
router.use('/datasets', datasets)
router.use('/executions', executions)
router.use('/knowledge-bases', knowledgeBases)
router.use('/notifications', notifications)
router.use('/tools', tools)
router.use('/user-preferences', userPreferences)

export default router
