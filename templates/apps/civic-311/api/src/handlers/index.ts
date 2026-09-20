import { Router } from 'express'

import billing from '../routes/billing.js'
import _test from './_test.js'
import issues from './issues.js'
import notifications from './notifications.js'
import photos from './photos.js'
import usersMe from './users-me.js'
import watchAreas from './watch-areas.js'

const router = Router()

router.use('/issues', issues)
// Photo upload/serve mounts under the issue namespace, BEFORE the issues
// router would otherwise claim `/issues/photo` as its `/:id` param for the
// exact one-segment path (serve URLs persisted on issues.photo_url are
// `/api/issues/photo/<fileId>` — two segments, so both orders route; this
// one just keeps the namespace claim unambiguous).
router.use('/issues/photo', photos)
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
