/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 * Everything here is served under `/api`: a route the client or a suite calls at
 * `/api/users` is declared as `/users`. Do not add a prefix of your own.
 */
import { Router } from 'express'

import alerts from './alerts.js'
import incidents from './incidents.js'
import logs from './logs.js'
import preferences from './preferences.js'
import savedSearches from './saved-searches.js'
import services from './services.js'
import sources from './sources.js'
import streams from './streams.js'
import traces from './traces.js'

const router = Router()

router.use('/logs', logs)
router.use('/sources', sources)
router.use('/preferences', preferences)
router.use('/saved-searches', savedSearches)
// `/saved` is the path the frontend's Dashboard / Saved page hits.
// Keep both mounts so the canonical CRUD endpoint is preserved while
// the page-shaped alias responds to the React app's expectations.
router.use('/saved', savedSearches)
router.use('/services', services)
router.use('/streams', streams)
router.use('/incidents', incidents)
router.use('/alerts', alerts)
router.use('/traces', traces)

export default router
