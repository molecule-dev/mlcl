/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 */
import { Router } from 'express'

import billing from '../routes/billing.js'
import bookings from './bookings.js'
import conversations from './conversations.js'
import flights from './flights.js'
import notifications from './notifications.js'
import preferences from './preferences.js'
import profile from './profile.js'
import speech from './speech.js'
import { payRouter, splitsRouter } from './splits.js'
import trips from './trips.js'

const router = Router()

router.use('/conversations', conversations)
router.use('/flights', flights)
router.use('/trips', trips)
router.use('/bookings', bookings)
router.use('/splits', splitsRouter)
router.use('/pay', payRouter)
router.use('/notifications', notifications)
router.use('/speech', speech)
router.use('/preferences', preferences)
router.use('/profile', profile)
router.use('/billing', billing)

export default router
