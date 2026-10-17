/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 */
import { Router } from 'express'

import attachments from './attachments.js'
import boards from './boards.js'
import cards from './cards.js'
import checklists from './checklists.js'
import comments from './comments.js'
import labels from './labels.js'
import lists from './lists.js'
import members from './members.js'
import notifications from './notifications.js'

const router = Router()

router.use('/boards', boards)
router.use('/lists', lists)
router.use('/cards', cards)
router.use('/labels', labels)
router.use('/checklists', checklists)
router.use('/attachments', attachments)
router.use('/comments', comments)
router.use('/members', members)
router.use('/notifications', notifications)

export default router
