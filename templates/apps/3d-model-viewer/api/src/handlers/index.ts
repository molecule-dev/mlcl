/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 * Everything here is served under `/api`: a route the client or a suite calls at
 * `/api/users` is declared as `/users`. Do not add a prefix of your own.
 */
import { Router } from 'express'

import { requestHandlerMap as User } from '../App/Resource/User/index.js'
import activityRouter from './activity.js'
import annotationsRouter from './annotations.js'
import authRouter from './auth.js'
import avatarRouter from './avatar.js'
import embedsRouter from './embeds.js'
import modelsRouter from './models.js'
import notificationsRouter from './notifications.js'

const router = Router()

// The default reset route in App/router.ts takes precedence when the resource provides it.
if (!User.resetPassword) router.use('/users', authRouter)
router.use('/user', avatarRouter)
router.use('/models', modelsRouter)
router.use('/annotations', annotationsRouter)
router.use('/embeds', embedsRouter)
router.use('/notifications', notificationsRouter)
router.use('/activity', activityRouter)

export default router
