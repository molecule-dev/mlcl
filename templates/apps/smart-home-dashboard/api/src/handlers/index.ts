/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 */
import { Router } from 'express'

import activity from './activity.js'
import automations from './automations.js'
import devices from './devices.js'
import energy from './energy.js'
import rooms from './rooms.js'
import scenes from './scenes.js'

const router = Router()

router.use('/iot-devices', devices)
router.use('/automations', automations)
router.use('/scenes', scenes)
router.use('/energy', energy)
router.use('/rooms', rooms)
router.use('/activity', activity)

export default router
