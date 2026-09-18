import { Router } from 'express'

import auditEvents from './audit-events.js'
import checkIns from './check-ins.js'
import keyResults from './key-results.js'
import notifications from './notifications.js'
import objectives from './objectives.js'
import periods from './periods.js'
import reviews from './reviews.js'
import settings from './settings.js'
import teams from './teams.js'

const router = Router()

router.use('/objectives', objectives)
router.use('/key-results', keyResults)
router.use('/check-ins', checkIns)
router.use('/periods', periods)
router.use('/teams', teams)
router.use('/reviews', reviews)
router.use('/notifications', notifications)
router.use('/audit-events', auditEvents)
router.use('/settings', settings)

export default router
