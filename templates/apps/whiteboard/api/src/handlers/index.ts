/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 * Everything here is served under `/api`: a route the client or a suite calls at
 * `/api/users` is declared as `/users`. Do not add a prefix of your own.
 */
import { Router } from 'express'

import boardsRouter from './boards.js'
import collaboratorsRouter from './collaborators.js'
import elementsRouter from './elements.js'
import framesRouter from './frames.js'
import templatesRouter from './templates.js'
import versionsRouter from './versions.js'

const router = Router()

router.use('/boards', boardsRouter)
router.use('/elements', elementsRouter)
router.use('/collaborators', collaboratorsRouter)
router.use('/versions', versionsRouter)
router.use('/frames', framesRouter)
router.use('/templates', templatesRouter)

export default router
