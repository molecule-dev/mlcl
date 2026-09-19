import { Router } from 'express'

import activities from './activities.js'
import dashboard from './dashboard.js'
import expenses from './expenses.js'
import friends from './friends.js'
import groups from './groups.js'
import settlements from './settlements.js'

const router = Router()

router.use('/groups', groups)
router.use('/friends', friends)
router.use('/expenses', expenses)
router.use('/settlements', settlements)
router.use('/activities', activities)
router.use('/dashboard', dashboard)

export default router
