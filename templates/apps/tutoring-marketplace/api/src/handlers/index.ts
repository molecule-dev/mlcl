import { Router } from 'express'

import bookingsRouter from './bookings.js'
import messagesRouter from './messages.js'
import reviewsRouter from './reviews.js'
import sessionsRouter from './sessions.js'
import subjectsRouter from './subjects.js'
import tutorsRouter from './tutors.js'

const router = Router()

router.use('/tutors', tutorsRouter)
router.use('/bookings', bookingsRouter)
router.use('/sessions', sessionsRouter)
router.use('/reviews', reviewsRouter)
router.use('/subjects', subjectsRouter)
router.use('/messages', messagesRouter)

export default router
