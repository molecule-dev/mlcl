import { Router } from 'express'

import billing from '../routes/billing.js'
import agents from './agents.js'
import conversations from './conversations.js'
import preferences from './preferences.js'
import profile from './profile.js'
import speech from './speech.js'

const router = Router()

router.use('/agents', agents)
router.use('/conversations', conversations)
router.use('/speech', speech)
router.use('/preferences', preferences)
router.use('/profile', profile)
router.use('/billing', billing)

export default router
