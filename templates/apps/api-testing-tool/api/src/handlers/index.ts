import { Router } from 'express'

import collections from './collections.js'
import environments from './environments.js'
import history from './history.js'
import mocks from './mocks.js'
import monitors from './monitors.js'
import requests from './requests.js'
import tests from './tests.js'

const router = Router()

router.use('/collections', collections)
router.use('/requests', requests)
router.use('/environments', environments)
router.use('/history', history)
router.use('/mocks', mocks)
router.use('/tests', tests)
router.use('/monitors', monitors)

export default router
