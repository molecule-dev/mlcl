/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 */
import { Router } from 'express'

import apiTokens from './api-tokens.js'
import collections from './collections.js'
import documents from './documents.js'
import graph from './graph.js'
import members from './members.js'
import notifications from './notifications.js'
import qa from './qa.js'
import reports from './reports.js'
import settings from './settings.js'
import sources from './sources.js'

const router = Router()

router.use('/collections', collections)
router.use('/documents', documents)
router.use('/sources', sources)
router.use('/qa', qa)
router.use('/members', members)
router.use('/notifications', notifications)
router.use('/api-tokens', apiTokens)
router.use('/graph', graph)
router.use('/reports', reports)
router.use('/settings', settings)

export default router
