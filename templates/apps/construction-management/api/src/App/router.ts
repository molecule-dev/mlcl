import { Router } from 'express'

import {
  mountDefaultDeviceRoutes,
  mountDefaultUserAuthRoutes,
  mountDefaultUserBillingRoutes,
  mountDefaultUserCrudRoutes,
  mountDefaultUserResetPasswordRoute,
  mountDefaultUserSecurityRoutes,
} from '@molecule/api-bonds-default-express'

import templateHandlers from '../handlers/index.js'
import { requestHandlerMap as Device } from './Resource/Device/index.js'
import {
  authorization as userAuthorization,
  requestHandlerMap as User,
} from './Resource/User/index.js'

export const router = Router()

// The app's session middleware — mounted ONCE, here, because this router is
// mounted at /api and every route below (the content handlers and the resource
// routes) runs after it. These options are the app's auth policy: what you pass
// to `verifyMiddleware()` here is what the requests get. Never mount a second
// one in server.ts — a mount there runs FIRST and this one then never sees a
// headerless request, so the policy you set here is silently ignored
// (X1 flash-m70: a cookie session resolved earlier kept `allowCookieSession:
// false` from ever applying).
router.use(userAuthorization.verifyMiddleware())

// The template's own content handlers, before the resource routes so a path they
// define wins over a resource route of the same name.
router.use(templateHandlers)

mountDefaultDeviceRoutes(router, Device)
mountDefaultUserAuthRoutes(router, User)
mountDefaultUserResetPasswordRoute(router, User)
mountDefaultUserCrudRoutes(router, User)
mountDefaultUserSecurityRoutes(router, User)
mountDefaultUserBillingRoutes(router, User)
