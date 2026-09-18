import { Router } from 'express'

import testEndpoints from './_test.js'
import alerts from './alerts.js'
import notifications from './notifications.js'
import prices from './prices.js'
import products from './products.js'
import sources from './sources.js'
import watchlist from './watchlist.js'

const router = Router()

router.use('/products', products)
router.use('/prices', prices)
router.use('/alerts', alerts)
router.use('/sources', sources)
router.use('/watchlist', watchlist)
router.use('/notifications', notifications)
// Dev-only test introspection (404 in production unless
// ENABLE_E2E_TEST_ENDPOINTS=true); see handlers/_test.ts. Mounted after the
// upstream verifyMiddleware (App/router.ts) so getUserId(res) is populated.
router.use('/_test', testEndpoints)

export default router
