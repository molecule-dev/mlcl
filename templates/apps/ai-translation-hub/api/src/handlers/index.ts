/**
 * Convenience aggregate router — re-exports each handler under its
 * canonical mount path. Prefer wiring through `api/src/App/router.ts` at
 * the application level (which also installs auth middleware); this file
 * exists for tests / scripts that want a single mounted router.
 */
import { Router } from 'express'

import activity from './activity.js'
import apiTokens from './api-tokens.js'
import glossary from './glossary.js'
import memory from './memory.js'
import notifications from './notifications.js'
import projects from './projects.js'
import reports from './reports.js'
import segments from './segments.js'
import team from './team.js'
import translations from './translations.js'

const router = Router()

router.use('/projects', projects)
router.use('/translations', translations)
router.use('/segments', segments)
router.use('/glossary', glossary)
router.use('/memory', memory)
router.use('/team', team)
router.use('/notifications', notifications)
router.use('/api-tokens', apiTokens)
router.use('/activity', activity)
router.use('/reports', reports)

export default router
