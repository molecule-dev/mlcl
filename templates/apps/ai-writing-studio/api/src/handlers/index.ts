import { Router } from 'express'

import billing from '../routes/billing.js'
import analytics from './analytics.js'
import credentials from './credentials.js'
import dashboard from './dashboard.js'
import documents from './documents.js'
import generate from './generate.js'
import images from './images.js'
import integrations from './integrations.js'
import preferences from './preferences.js'
import profile from './profile.js'
import seo from './seo.js'
import templates from './templates.js'

const router = Router()

router.use('/documents', documents)
router.use('/templates', templates)
router.use('/generate', generate)
router.use('/images', images)
router.use('/credentials', credentials)
// SEO routes are nested under /seo/documents/:id/... — keep the seo router
// rooted at /seo so the templated paths align with the SEOAnalysis page.
router.use('/seo', seo)
router.use('/billing', billing)
router.use('/dashboard', dashboard)
router.use('/profile', profile)
router.use('/analytics', analytics)
router.use('/integrations', integrations)
router.use('/preferences', preferences)

export default router
