import { Router } from 'express'

import apiKeys from './api-keys.js'
import bootstrap from './bootstrap.js'
import collections from './collections.js'
import credits from './credits.js'
import gallery from './gallery.js'
import generations from './generations.js'
import models from './models.js'
import notifications from './notifications.js'
import plans from './plans.js'
import profile from './profile.js'
import prompts from './prompts.js'
import styles from './styles.js'

const router = Router()

router.use('/api-keys', apiKeys)
router.use('/bootstrap', bootstrap)
router.use('/collections', collections)
router.use('/credits', credits)
router.use('/gallery', gallery)
router.use('/generations', generations)
router.use('/models', models)
router.use('/notifications', notifications)
router.use('/plans', plans)
router.use('/profile', profile)
router.use('/prompts', prompts)
router.use('/styles', styles)

export default router
