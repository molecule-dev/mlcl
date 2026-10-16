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
import { logger } from '@molecule/api-logger'

import templateHandlers from '../handlers/index.js'
import { requestHandlerMap as Device } from './Resource/Device/index.js'
import {
  authorization as userAuthorization,
  requestHandlerMap as User,
} from './Resource/User/index.js'

export const router = Router()

// Run JWT verification BEFORE any /api handler so res.locals.session is
// populated for both the per-app content routes and the molecule resource
// routes (users, devices). Without this the content-handler `getUserId(res)`
// always returns null and every authed POST short-circuits to 401 even with a
// valid Bearer/cookie. This is the app's session middleware — mounted ONCE,
// here, because this router is mounted at /api and everything below runs after
// it: what you pass to `verifyMiddleware()` here is the app's auth policy.
// Never mount a second one in server.ts — a mount there runs FIRST and this one
// then never sees a headerless request (X1 flash-m70: a cookie session resolved
// earlier kept `allowCookieSession: false` from ever applying).
router.use(userAuthorization.verifyMiddleware())

// Seed per-user demo content (subscriptions, queue, saved, notifications)
// on first authenticated request. seedDemoForUserOnce() de-dupes per
// process via a promise cache — concurrent authed requests for the same
// user share one seed run. Subsequent requests resolve instantly. We
// AWAIT (not fire-and-forget) because the next request after signup is
// typically the Library page loading /api/subscriptions/shows, which
// needs to see the seeded rows. The first authed request pays a small
// one-time cost; everything after is free.
router.use(async (_req, res, next) => {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (userId) {
    try {
      const { seedDemoForUserOnce } = await import('../handlers/_seed.js')
      await seedDemoForUserOnce(userId)
    } catch (error) {
      logger.error(error)
    }
  }
  next()
})

router.use(templateHandlers)

mountDefaultDeviceRoutes(router, Device)
mountDefaultUserAuthRoutes(router, User)
mountDefaultUserResetPasswordRoute(router, User)
mountDefaultUserCrudRoutes(router, User)
mountDefaultUserSecurityRoutes(router, User)
mountDefaultUserBillingRoutes(router, User)
mountDefaultUserVerifyPaymentRoutes(router, User)
