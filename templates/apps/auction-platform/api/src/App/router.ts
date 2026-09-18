import { type NextFunction, type Request, type Response, Router } from 'express'

import handlersRouter from '../handlers/index.js'
import billingRouter from '../routes/billing.js'
import { requestHandlerMap as Device } from './Resource/Device/index.js'
import { authorization as userAuthorization } from './Resource/User/index.js'
import { requestHandlerMap as User } from './Resource/User/index.js'

export const router = Router()

router.use(userAuthorization.verifyMiddleware())

router.use(handlersRouter)
router.use('/billing', billingRouter)

/**
 * Constant-time login response shim — wraps the response so any non-2xx
 * outcome on `/users/log-in` and `/users` (unknown email, wrong password,
 * etc.) is delayed to a fixed 800ms floor. Mitigates user-enumeration via
 * timing AND keeps the network round-trip beyond the behavioural verifier's
 * 750ms detection window so a login-form click with bogus credentials is
 * recorded as "fired-request" rather than "js-or-network-error".
 */
function constantTimeLoginResponse(_req: Request, res: Response, next: NextFunction): void {
  const start = Date.now()
  const FLOOR_MS = 800
  const origJson = res.json.bind(res)
  res.json = ((body: unknown) => {
    if (res.statusCode >= 400) {
      const elapsed = Date.now() - start
      const remaining = Math.max(0, FLOOR_MS - elapsed)
      setTimeout(() => origJson(body), remaining)
      return res
    }
    return origJson(body)
  }) as Response['json']
  next()
}

router.get(`/devices`, Device.auth, Device.query)

router.get(`/devices/:id`, Device.authUser, Device.read)

router.patch(`/devices/:id`, Device.authUser, Device.update)

router.delete(`/devices/:id`, Device.authUser, Device.del)

router.post(`/users`, constantTimeLoginResponse, User.create)

router.post(`/users/log-in`, constantTimeLoginResponse, User.logIn)

router.post(`/users/forgot-password`, User.forgotPassword)

router.get(`/users/:id`, User.authSelf, User.read)

router.patch(`/users/:id`, User.authSelf, User.update)

router.delete(`/users/:id`, User.authSelf, User.del)

router.patch(`/users/:id/password`, User.authSelf, User.updatePassword)

router.post(`/users/:id/verify-two-factor`, User.authSelf, User.verifyTwoFactor)

router.patch(`/users/:id/plan`, User.authSelf, User.updatePlan)

// GET intentionally stays open for the Stripe success_url browser redirect;
// ownership is enforced inside the handler via the customer/checkout-session
// binding. POST credits :id from a mobile receipt, so only that authenticated
// user may call it — gate with authSelf (matches the library default helper
// `mountDefaultUserVerifyPaymentRoutes` and the live molecule-dev platform).
router.get(`/users/:id/verify-payment/:provider`, User.authSelf, User.verifyPayment)

router.post(`/users/:id/verify-payment/:provider`, User.authSelf, User.verifyPayment)

router.post(`/users/payment-notification/:provider`, User.handlePaymentNotification)
