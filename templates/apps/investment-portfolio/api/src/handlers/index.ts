import { Router } from 'express'

import holdings from './holdings.js'
import news from './news.js'
import notificationPreferences from './notification-preferences.js'
import notifications from './notifications.js'
import reports from './reports.js'
import transactions from './transactions.js'
import userSettings from './user-settings.js'
import watchlist from './watchlist.js'

const router = Router()

router.use('/holdings', holdings)
router.use('/transactions', transactions)
router.use('/watchlist', watchlist)
router.use('/news', news)
router.use('/notifications', notifications)
router.use('/notification-preferences', notificationPreferences)
router.use('/reports', reports)
router.use('/user-settings', userSettings)

export default router
