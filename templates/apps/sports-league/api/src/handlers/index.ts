import { Router } from 'express'

import testEndpoints from './_test.js'
import favoriteTeams from './favorite-teams.js'
import notifications from './notifications.js'
import players from './players.js'
import profile from './profile.js'
import schedule from './schedule.js'
import scores from './scores.js'
import standings from './standings.js'
import stats from './stats.js'
import teams from './teams.js'

const router = Router()

router.use('/teams', teams)
router.use('/players', players)
router.use('/profile', profile)
router.use('/schedule', schedule)
router.use('/scores', scores)
router.use('/standings', standings)
router.use('/stats', stats)
router.use('/favorite-teams', favoriteTeams)
router.use('/notifications', notifications)
// Dev-only test introspection (404 in production unless
// ENABLE_E2E_TEST_ENDPOINTS=true); see handlers/_test.ts. Mounted after the
// upstream verifyMiddleware so getUserId(res) is populated.
router.use('/_test', testEndpoints)

export default router
