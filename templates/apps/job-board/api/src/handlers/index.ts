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
