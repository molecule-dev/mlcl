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
import { t } from '@molecule/api-i18n'

import { isManagedAvatar } from '../handlers/avatar.js'
import templateHandlers from '../handlers/index.js'
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
mountDefaultUserCrudRoutes(router, {
  ...User,
  update: (req, res, next) => {
    // The upload route creates managed avatar URLs. A profile patch may not claim one.
    if (isManagedAvatar(req.body?.avatar)) {
      res.status(400).json({
        error: t('uploads.useAvatarRoute', {}, { defaultValue: 'Upload the avatar to set it.' }),
      })
      return
    }
    return User.update(req, res, next)
  },
})
mountDefaultUserSecurityRoutes(router, User)
mountDefaultUserBillingRoutes(router, User)
// POST/GET /users/:id/verify-payment/:provider — what the checkout return
// page (/plan-updated) calls to actually grant the paid plan. Without this
// mount the app's own checkout success_url 404s and the purchase is never
// confirmed.
mountDefaultUserVerifyPaymentRoutes(router, User)

router.use(templateHandlers)
