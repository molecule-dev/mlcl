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
import testEndpoints from './_test.js'
import articles from './articles.js'
import macros from './macros.js'
import sla from './sla.js'
import tickets from './tickets.js'
import usersMe from './users-me.js'

const router = Router()

router.use('/tickets', tickets)
router.use('/articles', articles)
router.use('/macros', macros)
router.use('/sla', sla)
// /users/me/* must be registered before the molecule user resource's
// /users/:id route in App/router.ts. domainRouter is mounted first inside
// App/router.ts, so domain handlers win for the /me path.
router.use('/users', usersMe)
router.use('/billing', billing)
// Dev-only test introspection (404 in production unless
// ENABLE_E2E_TEST_ENDPOINTS=true); see handlers/_test.ts. Mounted after the
// upstream verifyMiddleware (App/router.ts) so getUserId(res) is populated.
router.use('/_test', testEndpoints)

export default router
