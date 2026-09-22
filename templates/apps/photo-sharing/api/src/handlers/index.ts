import { Router } from 'express'

import albums from './albums.js'
import galleries from './galleries.js'
import photos from './photos.js'
import preferences from './preferences.js'
import profiles from './profiles.js'

const router = Router()

router.use('/photos', photos)
router.use('/albums', albums)
router.use('/profiles', profiles)
router.use('/galleries', galleries)
router.use('/preferences', preferences)

export default router
