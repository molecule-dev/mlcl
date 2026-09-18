import { Router } from 'express'

import favoritesRouter from './favorites.js'
import listsRouter from './lists.js'
import notificationsRouter from './notifications.js'
import restaurantsRouter from './restaurants.js'
import reviewsRouter from './reviews.js'

const router = Router()

router.use('/restaurants', restaurantsRouter)
router.use('/reviews', reviewsRouter)
router.use('/favorites', favoritesRouter)
router.use('/lists', listsRouter)
router.use('/notifications', notificationsRouter)

export default router
