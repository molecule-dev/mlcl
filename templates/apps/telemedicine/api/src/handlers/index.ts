import { Router } from 'express'

import appointmentsRouter from './appointments.js'
import consultationsRouter from './consultations.js'
import notificationsRouter from './notifications.js'
import portalRouter from './portal.js'
import prescriptionsRouter from './prescriptions.js'
import providersRouter from './providers.js'
import recordsRouter from './records.js'
const router = Router()

// Mount the patient-portal aggregator first so its `/providers/search`
// handler matches before the resource-style `/providers/:id` route below
// (Express picks the first match). Same for `/patients`.
router.use('/', portalRouter)
router.use('/providers', providersRouter)
router.use('/appointments', appointmentsRouter)
router.use('/consultations', consultationsRouter)
router.use('/records', recordsRouter)
router.use('/prescriptions', prescriptionsRouter)
router.use('/notifications', notificationsRouter)
export default router
