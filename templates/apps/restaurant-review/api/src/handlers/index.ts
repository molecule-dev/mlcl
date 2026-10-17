/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 */
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
