import { Router } from 'express'

import audit from './audit.js'
import components from './components.js'
import incidents from './incidents.js'
import maintenance from './maintenance.js'
import notifications from './notifications.js'
import publicRoutes from './public.js'
import subscribers from './subscribers.js'
import team from './team.js'

const router = Router()

router.use('/public', publicRoutes)
router.use('/audit', audit)
router.use('/components', components)
router.use('/incidents', incidents)
router.use('/maintenance', maintenance)
router.use('/notifications', notifications)
router.use('/subscribers', subscribers)
router.use('/team', team)

export default router
