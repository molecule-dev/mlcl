/**
 * Convenience aggregate router — re-exports each handler under its
 * canonical mount path. Prefer wiring through `api/src/App/router.ts` at
 * the application level (which also installs auth middleware); this file
 * exists for tests / scripts that want a single mounted router.
 *
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 * Everything here is served under `/api`: a route the client or a suite calls at
 * `/api/users` is declared as `/users`. Do not add a prefix of your own.
 */
import { Router } from 'express'

import activityRouter from './activity.js'
import apiTokensRouter from './api-tokens.js'
import glossaryRouter from './glossary.js'
import memoryRouter from './memory.js'
import notificationsRouter from './notifications.js'
import projectsRouter from './projects.js'
import reportsRouter from './reports.js'
import segmentsRouter from './segments.js'
import teamRouter from './team.js'
import translationsRouter from './translations.js'

const router = Router()

router.use('/projects', projectsRouter)
router.use('/translations', translationsRouter)
router.use('/segments', segmentsRouter)
router.use('/glossary', glossaryRouter)
router.use('/memory', memoryRouter)
router.use('/team', teamRouter)
router.use('/notifications', notificationsRouter)
router.use('/api-tokens', apiTokensRouter)
router.use('/activity', activityRouter)
router.use('/reports', reportsRouter)

export default router
