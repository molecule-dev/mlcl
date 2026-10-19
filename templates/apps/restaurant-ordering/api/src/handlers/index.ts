/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 * Everything here is served under `/api`: a route the client or a suite calls at
 * `/api/users` is declared as `/users`. Do not add a prefix of your own.
 */
import { Router } from 'express'

import analytics from './analytics.js'
import customers from './customers.js'
import emergencyContact from './emergency-contact.js'
import guest from './guest.js'
import kitchen from './kitchen.js'
import menu from './menu.js'
import notifications from './notifications.js'
import orders from './orders.js'
import reservations from './reservations.js'
import tables from './tables.js'

const router = Router()

router.use('/analytics', analytics)
router.use('/customers', customers)
router.use('/emergency-contact', emergencyContact)
router.use('/guest', guest)
router.use('/kitchen', kitchen)
router.use('/menu', menu)
router.use('/notifications', notifications)
router.use('/orders', orders)
router.use('/reservations', reservations)
router.use('/tables', tables)

export default router
