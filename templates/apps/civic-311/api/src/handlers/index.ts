/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 * Everything here is served under `/api`: a route the client or a suite calls at
 * `/api/users` is declared as `/users`. Do not add a prefix of your own.
 */
import { Router } from 'express'

import billing from '../routes/billing.js'
import _test from './_test.js'
import issues from './issues.js'
import notifications from './notifications.js'
import photos from './photos.js'
import usersMe from './users-me.js'
import watchAreas from './watch-areas.js'

const router = Router()

// Before `/issues`, so the issues router's `/:id` routes never see `/issues/photo/<fileId>`.
router.use('/issues/photo', photos)
router.use('/issues', issues)
router.use('/watch-areas', watchAreas)
router.use('/notifications', notifications)
// /users/me/* must be registered before the molecule user resource's
// /users/:id route in App/router.ts. domainRouter is mounted first inside
// App/router.ts, so domain handlers win for the /me path.
router.use('/users', usersMe)
router.use('/billing', billing)
// Dev-only test introspection (404 in production unless
// ENABLE_E2E_TEST_ENDPOINTS=true); see handlers/_test.ts. Mounted after the
// upstream verifyMiddleware (App/router.ts) so getUserId(res) is populated.
router.use('/_test', _test)

export default router
