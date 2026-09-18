import { Router } from 'express'

import attendeesRouter from './attendees.js'
import checkinRouter from './checkin.js'
import dashboardRouter from './dashboard.js'
import eventsRouter from './events.js'
import myTicketsRouter from './my-tickets.js'
import notificationsRouter from './notifications.js'
import ordersRouter from './orders.js'
import profileRouter from './profile.js'
import refundsRouter from './refunds.js'
import ticketsRouter from './tickets.js'
import transfersRouter from './transfers.js'

const router = Router()

router.use('/dashboard', dashboardRouter)
router.use('/events', eventsRouter)
// `tickets` here means ticket-tier CRUD (event-scoped configuration).
router.use('/ticket-tiers', ticketsRouter)
// Issued tickets (per-attendee). Holds list+detail+wallet-pass.
router.use('/tickets', myTicketsRouter)
router.use('/orders', ordersRouter)
router.use('/checkin', checkinRouter)
router.use('/transfers', transfersRouter)
router.use('/refunds', refundsRouter)
router.use('/attendees', attendeesRouter)
router.use('/notifications', notificationsRouter)
router.use('/profile', profileRouter)

export default router
