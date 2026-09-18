import { Router } from 'express'

import apiTokens from './api-tokens.js'
import collections from './collections.js'
import documents from './documents.js'
import graph from './graph.js'
import members from './members.js'
import notifications from './notifications.js'
import qa from './qa.js'
import reports from './reports.js'
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

export default router
