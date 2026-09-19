import { Router } from 'express'

import billing from '../routes/billing.js'
import feed from './feed.js'
import issues from './issues.js'
import profile from './profile.js'
import settings from './settings.js'
import stats from './stats.js'
import subscribers from './subscribers.js'

const router = Router()

router.use('/issues', issues)
router.use('/subscribers', subscribers)
router.use('/stats', stats)
router.use('/settings', settings)
router.use('/feed', feed)
router.use('/billing', billing)
router.use('/', profile)

export default router
