import { Router } from 'express'

import draftsRouter from './drafts.js'
import emailsRouter from './emails.js'
import foldersRouter from './folders.js'
import labelsRouter from './labels.js'

const router = Router()

router.use('/emails', emailsRouter)
router.use('/folders', foldersRouter)
router.use('/labels', labelsRouter)
router.use('/drafts', draftsRouter)

export default router
