/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 */
import { Router } from 'express'

import activities from './activities.js'
import dashboard from './dashboard.js'
import expenses from './expenses.js'
import friends from './friends.js'
import groups from './groups.js'
import settlements from './settlements.js'

const router = Router()

router.use('/groups', groups)
router.use('/friends', friends)
router.use('/expenses', expenses)
router.use('/settlements', settlements)
router.use('/activities', activities)
router.use('/dashboard', dashboard)

export default router
