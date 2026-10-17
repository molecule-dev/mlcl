/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 */
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
