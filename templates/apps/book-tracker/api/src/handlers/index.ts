import { Router } from 'express'

import books from './books.js'
import challenge from './challenge.js'
import notifications from './notifications.js'
import profile from './profile.js'
import reports from './reports.js'
import reviews from './reviews.js'
import sessions from './sessions.js'
import stats from './stats.js'

const router = Router()

router.use('/books', books)
router.use('/sessions', sessions)
router.use('/challenge', challenge)
router.use('/reviews', reviews)
router.use('/notifications', notifications)
router.use('/profile', profile)
router.use('/reports', reports)
router.use('/stats', stats)

export default router
