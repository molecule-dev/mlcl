/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 * Everything here is served under `/api`: a route the client or a suite calls at
 * `/api/users` is declared as `/users`. Do not add a prefix of your own.
 */
import { Router } from 'express'

import allergiesRouter from './allergies.js'
import conditionsRouter from './conditions.js'
import documentsRouter from './documents.js'
import immunizationsRouter from './immunizations.js'
import labsRouter from './labs.js'
import medicationsRouter from './medications.js'
import notificationsRouter from './notifications.js'
import profileRouter from './profile.js'
import recordsRouter from './records.js'
import sharingRouter from './sharing.js'
import statsRouter from './stats.js'
import visitsRouter from './visits.js'
import vitalsRouter from './vitals.js'

const router = Router()

router.use('/conditions', conditionsRouter)
router.use('/medications', medicationsRouter)
router.use('/labs', labsRouter)
router.use('/vitals', vitalsRouter)
router.use('/immunizations', immunizationsRouter)
router.use('/allergies', allergiesRouter)
router.use('/documents', documentsRouter)
router.use('/visits', visitsRouter)
router.use('/sharing', sharingRouter)
router.use('/notifications', notificationsRouter)
router.use('/records', recordsRouter)
router.use('/stats', statsRouter)
router.use('/profile', profileRouter)

export default router
