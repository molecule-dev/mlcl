import { Router } from 'express'

import activitiesRouter from './activities.js'
import bookingsRouter from './bookings.js'
import collaboratorsRouter from './collaborators.js'
import destinationsRouter from './destinations.js'
import expensesRouter from './expenses.js'
import notificationsRouter from './notifications.js'
import tripsRouter from './trips.js'

const router = Router()

router.use('/trips', tripsRouter)
router.use('/activities', activitiesRouter)
router.use('/collaborators', collaboratorsRouter)
router.use('/bookings', bookingsRouter)
router.use('/destinations', destinationsRouter)
router.use('/expenses', expensesRouter)
router.use('/notifications', notificationsRouter)

export default router
