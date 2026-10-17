/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 */
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
