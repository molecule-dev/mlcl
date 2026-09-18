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
