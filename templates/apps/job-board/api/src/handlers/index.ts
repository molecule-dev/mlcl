/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 */
import { Router } from 'express'

import applications from './applications.js'
import categories from './categories.js'
import companies from './companies.js'
import jobs from './jobs.js'
import notifications from './notifications.js'
import savedJobs from './saved-jobs.js'
import userProfiles from './user-profiles.js'

const router = Router()

router.use('/jobs', jobs)
router.use('/applications', applications)
router.use('/companies', companies)
router.use('/categories', categories)
router.use('/notifications', notifications)
router.use('/saved-jobs', savedJobs)
router.use('/user-profiles', userProfiles)

export default router
