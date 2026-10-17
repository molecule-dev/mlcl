/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 */
import { Router } from 'express'

import automations from './automations.js'
import charts from './charts.js'
import collaborators from './collaborators.js'
import columns from './columns.js'
import importExport from './import-export.js'
import integrations from './integrations.js'
import notifications from './notifications.js'
import rows from './rows.js'
import search from './search.js'
import sheets from './sheets.js'
import spreadsheets from './spreadsheets.js'
import templates from './templates.js'
import versions from './versions.js'

const router = Router()

router.use('/spreadsheets', spreadsheets)
router.use('/sheets', sheets)
router.use('/columns', columns)
router.use('/rows', rows)
router.use('/automations', automations)
router.use('/charts', charts)
router.use('/spreadsheet-versions', versions)
router.use('/spreadsheet-collaborators', collaborators)
router.use('/integrations', integrations)
router.use('/spreadsheet-templates', templates)
router.use('/notifications', notifications)
router.use('/search', search)
router.use(importExport)

export default router
