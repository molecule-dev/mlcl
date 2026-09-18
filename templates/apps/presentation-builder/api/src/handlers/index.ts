import { Router } from 'express'

import exports from './exports.js'
import presentations from './presentations.js'
import slides from './slides.js'
import themes from './themes.js'

const router = Router()

router.use(presentations)
router.use(slides)
router.use(themes)
router.use(exports)

export default router
