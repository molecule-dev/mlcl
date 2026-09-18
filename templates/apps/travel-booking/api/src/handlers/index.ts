import { Router } from 'express'

import accommodationsRouter from './accommodations.js'
import bookingsRouter from './bookings.js'
import destinationsRouter from './destinations.js'
import favoritesRouter from './favorites.js'
import itinerariesRouter from './itineraries.js'
import notificationsRouter from './notifications.js'
import profileRouter from './profile.js'
import reviewsRouter from './reviews.js'
import tripsRouter from './trips.js'

const router = Router()

router.use('/accommodations', accommodationsRouter)
router.use('/bookings', bookingsRouter)
router.use('/destinations', destinationsRouter)
router.use('/favorites', favoritesRouter)
router.use('/itineraries', itinerariesRouter)
router.use('/notifications', notificationsRouter)
router.use('/profile', profileRouter)
router.use('/reviews', reviewsRouter)
router.use('/trips', tripsRouter)

export default router
