import { Router } from 'express'

import availability from './availability.js'
import bookings from './bookings.js'
import eventTypes from './event-types.js'
import profile from './profile.js'

const router = Router()

router.use('/event-types', eventTypes)
router.use('/availability', availability)
router.use('/bookings', bookings)
router.use('/profile', profile)

export default router
