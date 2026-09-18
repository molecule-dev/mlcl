import { Router } from 'express'

import _debug from './_debug.js'
import categories from './categories.js'
import clips from './clips.js'
import devices from './devices.js'
import pinned from './pinned.js'
import profile from './profile.js'
const router = Router()

router.use('/_debug', _debug)
router.use('/clips', clips)
router.use('/categories', categories)
router.use('/devices', devices)
router.use('/pinned', pinned)
router.use('/profile', profile)
export default router
