import { Router } from 'express'

import labels from './labels.js'
import notifications from './notifications.js'
import projects from './projects.js'
import tasks from './tasks.js'

const router = Router()

router.use('/tasks', tasks)
router.use('/projects', projects)
router.use('/labels', labels)
router.use('/notifications', notifications)

export default router
