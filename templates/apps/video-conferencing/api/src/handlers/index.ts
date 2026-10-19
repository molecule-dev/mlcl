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
import chat from './chat.js'
import invites from './invites.js'
import meetings from './meetings.js'
import notifications from './notifications.js'
import participants from './participants.js'
import recordings from './recordings.js'
import workspaceMembers from './workspace-members.js'
import workspaces from './workspaces.js'

const router = Router()

router.use('/meetings', meetings)
router.use('/participants', participants)
router.use('/chat', chat)
router.use('/recordings', recordings)
router.use('/notifications', notifications)
router.use('/workspaces', workspaces)
router.use('/workspace-members', workspaceMembers)
router.use('/invites', invites)
router.use('/billing', billing)
router.use('/notifications', notifications)

export default router
