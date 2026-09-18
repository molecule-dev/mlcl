import { Router } from 'express'

import artifacts from './artifacts.js'
import builds from './builds.js'
import environments from './environments.js'
import insights from './insights.js'
import notifications from './notifications.js'
import pipelines from './pipelines.js'
import profile from './profile.js'
import repositories from './repositories.js'
import secrets from './secrets.js'
import webhooks from './webhooks.js'

const router = Router()

router.use('/artifacts', artifacts)
router.use('/builds', builds)
router.use('/environments', environments)
router.use('/insights', insights)
router.use('/me', profile)
router.use('/notifications', notifications)
router.use('/pipelines', pipelines)
router.use('/repositories', repositories)
router.use('/secrets', secrets)
router.use('/webhooks', webhooks)

export default router
