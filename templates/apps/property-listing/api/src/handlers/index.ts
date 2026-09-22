import { Router } from 'express'

import billingRouter from '../routes/billing.js'
import agentsRouter from './agents.js'
import bookmarksRouter from './bookmarks.js'
import leadsRouter from './leads.js'
import mortgageRouter from './mortgage.js'
import propertiesRouter from './properties.js'
import settingsRouter from './settings.js'
import showingsRouter from './showings.js'

const router = Router()

router.use('/properties', propertiesRouter)
router.use('/agents', agentsRouter)
router.use('/mortgage', mortgageRouter)
router.use('/leads', leadsRouter)
router.use('/showings', showingsRouter)
router.use('/bookmarks', bookmarksRouter)
router.use('/billing', billingRouter)
router.use('/settings', settingsRouter)

export default router
