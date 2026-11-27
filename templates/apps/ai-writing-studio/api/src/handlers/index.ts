/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 * Everything here is served under `/api`: a route the client or a suite calls at
 * `/api/users` is declared as `/users`. Do not add a prefix of your own.
 */
import { Router } from 'express'

import analyticsRouter from './analytics.js'
import credentialsRouter from './credentials.js'
import dashboardRouter from './dashboard.js'
import documentsRouter from './documents.js'
import generateRouter from './generate.js'
import imagesRouter from './images.js'
import integrationsRouter from './integrations.js'
import preferencesRouter from './preferences.js'
import profileRouter from './profile.js'
import seoRouter from './seo.js'
import templatesRouter from './templates.js'

const router = Router()

router.use('/documents', documentsRouter)
router.use('/templates', templatesRouter)
router.use('/generate', generateRouter)
router.use('/images', imagesRouter)
router.use('/credentials', credentialsRouter)
router.use('/seo', seoRouter)
router.use('/dashboard', dashboardRouter)
router.use('/profile', profileRouter)
router.use('/analytics', analyticsRouter)
router.use('/integrations', integrationsRouter)
router.use('/preferences', preferencesRouter)

export default router
