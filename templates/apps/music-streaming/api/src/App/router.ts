import { Router } from 'express'

import {
  mountDefaultDeviceRoutes,
  mountDefaultUserAuthRoutes,
  mountDefaultUserBillingRoutes,
  mountDefaultUserCrudRoutes,
  mountDefaultUserResetPasswordRoute,
  mountDefaultUserSecurityRoutes,
  mountDefaultUserVerifyPaymentRoutes,
} from '@molecule/api-bonds-default-express'

import albumsRouter from '../handlers/albums.js'
import artistsRouter from '../handlers/artists.js'
import followRouter from '../handlers/follow.js'
import likedRouter from '../handlers/liked.js'
import notificationsRouter from '../handlers/notifications.js'
import playlistsRouter from '../handlers/playlists.js'
import preferencesRouter from '../handlers/preferences.js'
import queueRouter from '../handlers/queue.js'
import reportsRouter from '../handlers/reports.js'
import searchRouter from '../handlers/search.js'
import tracksRouter from '../handlers/tracks.js'
import billingRouter from '../routes/billing.js'
import { requestHandlerMap as Device } from './Resource/Device/index.js'
import {
  authorization as userAuthorization,
  requestHandlerMap as User,
} from './Resource/User/index.js'

export const router = Router()

router.use(userAuthorization.verifyMiddleware())

mountDefaultDeviceRoutes(router, Device)
mountDefaultUserAuthRoutes(router, User)
mountDefaultUserResetPasswordRoute(router, User)
mountDefaultUserCrudRoutes(router, User)
mountDefaultUserSecurityRoutes(router, User)
mountDefaultUserBillingRoutes(router, User)
mountDefaultUserVerifyPaymentRoutes(router, User)

router.use('/tracks', likedRouter)
router.use('/tracks', tracksRouter)
router.use('/playlists', playlistsRouter)
router.use('/artists', artistsRouter)
router.use('/albums', albumsRouter)
router.use('/billing', billingRouter)
router.use('/queue', queueRouter)
router.use('/notifications', notificationsRouter)
router.use('/preferences', preferencesRouter)
router.use('/reports', reportsRouter)
router.use('/search', searchRouter)
router.use('/', followRouter)
