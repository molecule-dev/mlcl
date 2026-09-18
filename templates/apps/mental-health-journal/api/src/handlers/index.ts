import { Router } from 'express'

import journalRouter from './journal.js'

const router = Router()

router.use('/journal', journalRouter)

export default router
