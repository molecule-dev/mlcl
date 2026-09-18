import { Router } from 'express'

import documents from './documents.js'
import notifications from './notifications.js'
import onboardingTemplates from './onboarding-templates.js'
import onboardings from './onboardings.js'
import profile from './profile.js'
import tasks from './tasks.js'
import teamMembers from './team-members.js'
import timelineMilestones from './timeline-milestones.js'
import trainingModules from './training-modules.js'
import trainingProgress from './training-progress.js'

const router = Router()

router.use('/onboardings', onboardings)
router.use('/onboarding-templates', onboardingTemplates)
router.use('/tasks', tasks)
router.use('/documents', documents)
router.use('/team-members', teamMembers)
router.use('/training-modules', trainingModules)
router.use('/training-progress', trainingProgress)
router.use('/timeline-milestones', timelineMilestones)
router.use('/notifications', notifications)
router.use('/profile', profile)

export default router
