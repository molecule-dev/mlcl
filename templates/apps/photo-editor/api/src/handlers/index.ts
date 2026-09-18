import { Router } from 'express'

import adjustments from './adjustments.js'
import albums from './albums.js'
import exportsHandler from './exports.js'
import filters from './filters.js'
import images from './images.js'
import layers from './layers.js'

const router = Router()

router.use('/images', images)
router.use('/filters', filters)
router.use('/adjustments', adjustments)
router.use('/exports', exportsHandler)
router.use('/albums', albums)
router.use('/layers', layers)

export default router
