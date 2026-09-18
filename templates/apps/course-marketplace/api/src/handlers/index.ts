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
