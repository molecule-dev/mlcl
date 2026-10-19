/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 * Everything here is served under `/api`: a route the client or a suite calls at
 * `/api/users` is declared as `/users`. Do not add a prefix of your own.
 */
import { Router } from 'express'

import _test from './_test.js'
import admin from './admin.js'
import boards from './boards.js'
import posts from './posts.js'
import votes from './votes.js'

const router = Router()

router.use('/boards', boards)
router.use('/posts', posts)
router.use('/votes', votes)
router.use('/admin', admin)
// Dev-only e2e setup router (POST /api/_test/promote-admin), 404 in
// production unless ENABLE_E2E_TEST_ENDPOINTS=true; see handlers/_test.ts.
// Mounted after the real surface so it can never shadow it.
router.use('/_test', _test)

export default router
