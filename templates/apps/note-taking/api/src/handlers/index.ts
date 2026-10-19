/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 * Everything here is served under `/api`: a route the client or a suite calls at
 * `/api/users` is declared as `/users`. Do not add a prefix of your own.
 */
import { Router } from 'express'

import blocks from './blocks.js'
import databases from './databases.js'
import pages from './pages.js'
import profile from './profile.js'
import templates from './templates.js'
import workspaces from './workspaces.js'

const router = Router()

router.use('/workspaces', workspaces)
router.use('/pages', pages)
router.use('/blocks', blocks)
router.use('/databases', databases)
router.use('/templates', templates)
router.use('/profile', profile)

export default router
