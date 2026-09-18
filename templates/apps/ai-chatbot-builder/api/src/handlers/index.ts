import { Router } from 'express'

import billing from '../routes/billing.js'
import bots from './bots.js'
import conversations from './conversations.js'
import intents from './intents.js'
import notifications from './notifications.js'
import profile from './profile.js'
import training from './training.js'

const router = Router()

router.use('/bots', bots)
router.use('/intents', intents)
router.use('/conversations', conversations)
router.use('/training', training)
router.use('/notifications', notifications)
router.use('/profile', profile)
router.use('/billing', billing)

export default router
