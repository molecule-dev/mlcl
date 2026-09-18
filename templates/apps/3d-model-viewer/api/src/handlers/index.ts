import { Router } from 'express'

import activity from './activity.js'
import annotations from './annotations.js'
import embeds from './embeds.js'
import models from './models.js'
import notifications from './notifications.js'

const router = Router()

router.use('/models', models)
router.use('/annotations', annotations)
router.use('/embeds', embeds)
router.use('/notifications', notifications)
router.use('/activity', activity)

export default router
