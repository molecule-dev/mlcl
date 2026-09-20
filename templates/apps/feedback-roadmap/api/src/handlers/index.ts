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
