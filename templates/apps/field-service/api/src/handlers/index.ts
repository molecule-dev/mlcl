import { Router } from 'express'

import billing from '../routes/billing.js'
import customers from './customers.js'
import invoices from './invoices.js'
import jobs from './jobs.js'
import notifications from './notifications.js'
import quotes from './quotes.js'
import technicians from './technicians.js'

const router = Router()

router.use('/customers', customers)
router.use('/technicians', technicians)
router.use('/quotes', quotes)
router.use('/jobs', jobs)
router.use('/invoices', invoices)
router.use('/notifications', notifications)
router.use('/billing', billing)

export default router
