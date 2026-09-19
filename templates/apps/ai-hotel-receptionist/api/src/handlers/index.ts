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
