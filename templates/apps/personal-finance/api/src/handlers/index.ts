/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 * Everything here is served under `/api`: a route the client or a suite calls at
 * `/api/users` is declared as `/users`. Do not add a prefix of your own.
 */
import { Router } from 'express'

import accountsRouter from './accounts.js'
import budgetsRouter from './budgets.js'
import categoriesRouter from './categories.js'
import dataExport from './data-export.js'
import goalsRouter from './goals.js'
import notificationsRouter from './notifications.js'
import reportsRouter from './reports.js'
import transactionsRouter from './transactions.js'

const router = Router()

router.use('/accounts', accountsRouter)
router.use('/transactions', transactionsRouter)
router.use('/budgets', budgetsRouter)
router.use('/goals', goalsRouter)
router.use('/categories', categoriesRouter)
router.use('/reports', reportsRouter)
router.use('/notifications', notificationsRouter)
router.use('/export', dataExport)

export default router
