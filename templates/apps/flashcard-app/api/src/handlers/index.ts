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
