import { Router } from 'express'

import peopleRouter from './people.js'
import profileRouter from './profile.js'
import treeRouter from './tree.js'

const router = Router()

router.use('/people', peopleRouter)
router.use('/tree', treeRouter)
router.use('/profile', profileRouter)

export default router
