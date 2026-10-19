/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 * Everything here is served under `/api`: a route the client or a suite calls at
 * `/api/users` is declared as `/users`. Do not add a prefix of your own.
 */
import { Router } from 'express'

import availabilityRouter from './availability.js'
import callsRouter from './calls.js'
import dashboardRouter from './dashboard.js'
import guestsRouter from './guests.js'
import ratePlansRouter from './rate-plans.js'
import reservationsRouter from './reservations.js'
import roomTypesRouter from './room-types.js'
import roomsRouter from './rooms.js'
import speechRouter from './speech.js'
import voiceRouter from './voice.js'
import voiceAgentsRouter from './voice-agents.js'

const router = Router()

// PMS domain routes
router.use('/room-types', roomTypesRouter)
router.use('/rooms', roomsRouter)
router.use('/rate-plans', ratePlansRouter)
router.use('/availability', availabilityRouter)
router.use('/reservations', reservationsRouter)
router.use('/guests', guestsRouter)

// Voice receptionist routes
router.use('/voice-agents', voiceAgentsRouter)
router.use('/calls', callsRouter)
router.use('/voice', voiceRouter)
router.use('/speech', speechRouter)

// Aggregates
router.use('/dashboard', dashboardRouter)

export default router
