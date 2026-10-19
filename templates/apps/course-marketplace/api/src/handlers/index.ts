/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 * Everything here is served under `/api`: a route the client or a suite calls at
 * `/api/users` is declared as `/users`. Do not add a prefix of your own.
 */
import { Router } from 'express'

import catalogRouter from './catalog.js'
import certificatesRouter from './certificates.js'
import checkoutRouter from './checkout.js'
import enrollmentsRouter from './enrollments.js'
import instructorsRouter from './instructors.js'
import lessonsRouter from './lessons.js'
import notificationsRouter from './notifications.js'
import reviewsRouter from './reviews.js'

const router = Router()

router.use('/courses', catalogRouter)
router.use('/lessons', lessonsRouter)
router.use('/enrollments', enrollmentsRouter)
router.use('/reviews', reviewsRouter)
router.use('/certificates', certificatesRouter)
router.use('/instructors', instructorsRouter)
router.use('/notifications', notificationsRouter)
router.use('/checkout', checkoutRouter)

export default router
