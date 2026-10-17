/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 */
import { Router } from 'express'

import budgetRouter from './budget.js'
import dashboardRouter from './dashboard.js'
import guestsRouter from './guests.js'
import profileRouter from './profile.js'
import rsvpPublicRouter from './rsvp.js'
import rsvpMealsRouter from './rsvp-meals.js'
import seatingRouter from './seating.js'
import tasksRouter from './tasks.js'
import vendorsRouter from './vendors.js'
import weddingRouter from './wedding.js'

const router = Router()

router.use('/dashboard', dashboardRouter)
router.use('/wedding', weddingRouter)
router.use('/guests', guestsRouter)
router.use('/rsvp-meals', rsvpMealsRouter)
// Public RSVP collection — mounted under /api/public/rsvp/:code; no auth.
router.use('/public/rsvp', rsvpPublicRouter)
router.use('/budget', budgetRouter)
router.use('/vendors', vendorsRouter)
router.use('/tasks', tasksRouter)
router.use('/seating', seatingRouter)
router.use('/profile', profileRouter)

export default router
