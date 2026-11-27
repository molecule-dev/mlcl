/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 * Everything here is served under `/api`: a route the client or a suite calls at
 * `/api/users` is declared as `/users`. Do not add a prefix of your own.
 */
import { Router } from 'express'

import documentsRouter from './documents.js'
import notificationsRouter from './notifications.js'
import onboardingTemplatesRouter from './onboarding-templates.js'
import onboardingsRouter from './onboardings.js'
import profileRouter from './profile.js'
import tasksRouter from './tasks.js'
import teamMembersRouter from './team-members.js'
import timelineMilestonesRouter from './timeline-milestones.js'
import trainingModulesRouter from './training-modules.js'
import trainingProgressRouter from './training-progress.js'

const router = Router()

router.use('/onboardings', onboardingsRouter)
router.use('/onboarding-templates', onboardingTemplatesRouter)
router.use('/tasks', tasksRouter)
router.use('/documents', documentsRouter)
router.use('/team-members', teamMembersRouter)
router.use('/training-modules', trainingModulesRouter)
router.use('/training-progress', trainingProgressRouter)
router.use('/timeline-milestones', timelineMilestonesRouter)
router.use('/notifications', notificationsRouter)
router.use('/profile', profileRouter)

export default router
