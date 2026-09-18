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
