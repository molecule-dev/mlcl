/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 * Everything here is served under `/api`: a route the client or a suite calls at
 * `/api/users` is declared as `/users`. Do not add a prefix of your own.
 */
import { Router } from 'express'

import alerts from './alerts.js'
import discover from './discover.js'
import errors from './errors.js'
import issues from './issues.js'
import notifications from './notifications.js'
import performance from './performance.js'
import profile from './profile.js'
import projects from './projects.js'
import projectsHealth from './projects-health.js'
import releases from './releases.js'
import settings from './settings.js'
import team from './team.js'

const router = Router()

router.use('/errors', errors)
router.use('/issues', issues)
router.use('/alerts', alerts)
router.use('/releases', releases)
router.use('/notifications', notifications)
router.use('/profile', profile)
router.use('/team', team)
router.use('/settings', settings)
router.use('/performance', performance)
router.use('/discover', discover)
router.use('/projects-health', projectsHealth)
router.use('/projects', projects)

export default router
