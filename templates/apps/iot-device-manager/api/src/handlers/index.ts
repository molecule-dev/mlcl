/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 * Everything here is served under `/api`: a route the client or a suite calls at
 * `/api/users` is declared as `/users`. Do not add a prefix of your own.
 */
import { Router } from 'express'

import alerts from './alerts.js'
import commands from './commands.js'
import devices from './devices.js'
import firmware from './firmware.js'
import fleets from './fleets.js'
import logs from './logs.js'
import reports from './reports.js'
import telemetry from './telemetry.js'

const router = Router()

router.use('/devices', devices)
router.use('/telemetry', telemetry)
router.use('/commands', commands)
router.use('/firmware', firmware)
router.use('/fleets', fleets)
router.use('/alerts', alerts)
router.use('/logs', logs)
router.use('/reports', reports)

export default router
