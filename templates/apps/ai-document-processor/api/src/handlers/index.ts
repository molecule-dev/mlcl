/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 * Everything here is served under `/api`: a route the client or a suite calls at
 * `/api/users` is declared as `/users`. Do not add a prefix of your own.
 */
import { Router } from 'express'

import apiTokensRouter from './api-tokens.js'
import documentsRouter from './documents.js'
import extractionRulesRouter from './extraction-rules.js'
import extractionTemplatesRouter from './extraction-templates.js'
import foldersRouter from './folders.js'
import integrationsRouter from './integrations.js'
import processingRouter from './processing.js'
import reportsRouter from './reports.js'
import uploadRouter from './upload.js'

const router = Router()

router.use('/documents/upload', uploadRouter)
router.use('/documents', documentsRouter)
router.use('/folders', foldersRouter)
router.use('/extraction-rules', extractionRulesRouter)
router.use('/extraction-templates', extractionTemplatesRouter)
router.use('/api-tokens', apiTokensRouter)
router.use('/processing', processingRouter)
router.use('/integrations', integrationsRouter)
router.use('/reports', reportsRouter)

export default router
