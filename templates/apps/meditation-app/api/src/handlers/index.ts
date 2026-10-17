/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 */
import { Router } from 'express'

import categoriesRouter from './categories.js'
import coursesRouter from './courses.js'
import favoritesRouter from './favorites.js'
import historyRouter from './history.js'
import journalRouter from './journal.js'
import notificationsRouter from './notifications.js'
import preferencesRouter from './preferences.js'
import sessionsRouter from './sessions.js'
import statsRouter from './stats.js'
const router = Router()

router.use('/sessions', sessionsRouter)
router.use('/categories', categoriesRouter)
router.use('/courses', coursesRouter)
router.use('/history', historyRouter)
router.use('/stats', statsRouter)
router.use('/journal', journalRouter)
router.use('/favorites', favoritesRouter)
router.use('/notifications', notificationsRouter)
router.use('/preferences', preferencesRouter)
export default router
