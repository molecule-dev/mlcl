/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 * Everything here is served under `/api`: a route the client or a suite calls at
 * `/api/users` is declared as `/users`. Do not add a prefix of your own.
 */
import { Router } from 'express'

import billing from '../routes/billing.js'
import contacts from './contacts.js'
import conversations from './conversations.js'
import groupMembers from './group-members.js'
import groups from './groups.js'
import media from './media.js'
import messages from './messages.js'
import notifications from './notifications.js'
import profile from './profile.js'
import reactions from './reactions.js'
import search from './search.js'

const router = Router()

router.use('/conversations', conversations)
router.use('/messages', messages)
router.use('/contacts', contacts)
router.use('/groups', groups)
router.use('/group-members', groupMembers)
router.use('/media', media)
router.use('/reactions', reactions)
router.use('/billing', billing)
router.use('/notifications', notifications)
router.use('/profile', profile)
router.use('/search', search)

export default router
