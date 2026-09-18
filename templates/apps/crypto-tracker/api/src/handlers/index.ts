import { Router } from 'express'

import alerts from './alerts.js'
import markets from './markets.js'
import news from './news.js'
import notifications from './notifications.js'
import portfolio from './portfolio.js'
import preferences from './preferences.js'
import reports from './reports.js'
import transactions from './transactions.js'
import watchlist from './watchlist.js'

const router = Router()

router.use('/markets', markets)
router.use('/portfolio', portfolio)
router.use('/alerts', alerts)
router.use('/news', news)
router.use('/notifications', notifications)
router.use('/preferences', preferences)
router.use('/transactions', transactions)
router.use('/watchlist', watchlist)
router.use('/reports', reports)

export default router
