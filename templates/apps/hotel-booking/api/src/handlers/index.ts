import { Router } from 'express'

import favoritesRouter from './favorites.js'
import hotelsRouter from './hotels.js'
import loyaltyRouter from './loyalty.js'
import notificationsRouter from './notifications.js'
import profileRouter from './profile.js'
import propertiesRouter from './properties.js'
import reservationsRouter from './reservations.js'
import reviewsRouter from './reviews.js'
import roomsRouter from './rooms.js'
import tripsRouter from './trips.js'

const router = Router()

// Domain canonical routes
router.use('/hotels', hotelsRouter)
router.use('/rooms', roomsRouter)
router.use('/reservations', reservationsRouter)
router.use('/reviews', reviewsRouter)

// View-shaped routes consumed by the React app
router.use('/properties', propertiesRouter)
router.use('/trips', tripsRouter)
router.use('/favorites', favoritesRouter)
router.use('/notifications', notificationsRouter)
router.use('/loyalty', loyaltyRouter)
router.use('/profile', profileRouter)

export default router
