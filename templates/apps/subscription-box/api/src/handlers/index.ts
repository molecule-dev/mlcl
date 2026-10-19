/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 * Everything here is served under `/api`: a route the client or a suite calls at
 * `/api/users` is declared as `/users`. Do not add a prefix of your own.
 */
import type { NextFunction, Request, Response } from 'express'
import { Router } from 'express'

import { seedGlobalCatalogIfEmpty } from './_seed.js'
import testEndpoints from './_test.js'
import boxes from './boxes.js'
import plans from './plans.js'
import shipments from './shipments.js'
import subscriptions from './subscriptions.js'

const router = Router()

// Bootstrap the subscription plans catalog the first time any request
// hits the template surface. Idempotent — `seedGlobalCatalogIfEmpty`
// returns fast on subsequent calls because the subscription_plans
// table is non-empty.
let seedPromise: Promise<unknown> | null = null
router.use(async (_req: Request, _res: Response, next: NextFunction) => {
  if (!seedPromise) {
    seedPromise = seedGlobalCatalogIfEmpty().catch(() => {
      // Reset on failure so a later request can retry.
      seedPromise = null
    })
  }
  await seedPromise.catch(() => {})
  next()
})

router.use('/plans', plans)
router.use('/subscriptions', subscriptions)
router.use('/boxes', boxes)
router.use('/shipments', shipments)
// Dev-only test introspection (404 in production unless
// ENABLE_E2E_TEST_ENDPOINTS=true); see handlers/_test.ts. Mounted after the
// upstream verifyMiddleware (App/router.ts) so getUserId(res) is populated.
router.use('/_test', testEndpoints)

export default router
