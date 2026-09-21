import { Router } from 'express'

import campaigns from './campaigns.js'
import dashboard from './dashboard.js'
import donors from './donors.js'
import gifts from './gifts.js'
import receipts from './receipts.js'
import settings from './settings.js'

const router = Router()

router.use('/donors', donors)
router.use('/gifts', gifts)
router.use('/campaigns', campaigns)
router.use('/receipts', receipts)
router.use('/dashboard', dashboard)
router.use('/settings', settings)

export default router
