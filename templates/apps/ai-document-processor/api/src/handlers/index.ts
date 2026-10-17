/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 */
import { Router } from 'express'

import apiTokens from './api-tokens.js'
import documents from './documents.js'
import extractionRules from './extraction-rules.js'
import extractionTemplates from './extraction-templates.js'
import folders from './folders.js'
import integrations from './integrations.js'
import processing from './processing.js'
import reports from './reports.js'

const router = Router()

router.use('/documents', documents)
router.use('/folders', folders)
router.use('/extraction-rules', extractionRules)
router.use('/extraction-templates', extractionTemplates)
router.use('/api-tokens', apiTokens)
router.use('/processing', processing)
router.use('/integrations', integrations)
router.use('/reports', reports)

export default router
