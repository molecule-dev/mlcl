/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 * Everything here is served under `/api`: a route the client or a suite calls at
 * `/api/users` is declared as `/users`. Do not add a prefix of your own.
 */
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
