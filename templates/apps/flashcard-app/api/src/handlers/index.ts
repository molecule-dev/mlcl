/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 */
import { Router } from 'express'

import cardsRouter from './cards.js'
import decksRouter from './decks.js'
import notificationsRouter from './notifications.js'
import profileRouter from './profile.js'
import reportsRouter from './reports.js'
import statsRouter from './stats.js'
import studyRouter from './study.js'

const router = Router()

router.use('/decks', decksRouter)
router.use('/cards', cardsRouter)
router.use('/study', studyRouter)
router.use('/stats', statsRouter)
router.use('/reports', reportsRouter)
router.use('/notifications', notificationsRouter)
router.use('/profile', profileRouter)

export default router
