/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 * Everything here is served under `/api`: a route the client or a suite calls at
 * `/api/users` is declared as `/users`. Do not add a prefix of your own.
 */
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
