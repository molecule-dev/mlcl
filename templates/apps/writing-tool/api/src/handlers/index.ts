import { Router } from 'express'

import documents from './documents.js'
import exports from './exports.js'
import folders from './folders.js'

const router = Router()

router.use('/documents', documents)
router.use('/folders', folders)
router.use('/exports', exports)

export default router
