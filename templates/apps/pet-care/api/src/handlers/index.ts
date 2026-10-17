/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 */
import { Router } from 'express'

import bookings from './bookings.js'
import health from './health.js'
import medications from './medications.js'
import notifications from './notifications.js'
import pets from './pets.js'
import sitters from './sitters.js'
import vetRecords from './vet-records.js'

const router = Router()

router.use('/pets', pets)
router.use('/vet-records', vetRecords)
router.use('/medications', medications)
router.use('/sitters', sitters)
router.use('/bookings', bookings)
router.use('/notifications', notifications)
router.use('/health', health)

export default router
