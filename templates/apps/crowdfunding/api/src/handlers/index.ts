import { Router } from 'express'

import campaigns from './campaigns.js'
import notifications from './notifications.js'
import pledges from './pledges.js'
import profiles from './profiles.js'
import tiers from './tiers.js'
import updates from './updates.js'

const router = Router()

router.use('/campaigns', campaigns)
router.use('/tiers', tiers)
router.use('/pledges', pledges)
router.use('/updates', updates)
router.use('/notifications', notifications)
router.use('/profiles', profiles)

export default router
