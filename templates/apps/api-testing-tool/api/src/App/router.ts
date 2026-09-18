import { type NextFunction, type Request, type Response, Router } from 'express'

import handlersRouter from '../handlers/index.js'
import billingRouter from '../routes/billing.js'
import publicMocksRouter from '../routes/public-mocks.js'
import { requestHandlerMap as Device } from './Resource/Device/index.js'
import { authorization as userAuthorization } from './Resource/User/index.js'
import { requestHandlerMap as User } from './Resource/User/index.js'

export const router = Router()

// Public mock-server endpoints (anonymous, token-gated). Mounted BEFORE the
// auth verifier so requests with no Authorization header still reach the
// handler — the `public_token` IS the auth, and `is_public=true` is
// enforced inside the route. Putting this after `verifyMiddleware()` would
// be harmless (verify just attaches session, never blocks) but mounting
// first makes the "no auth required" intent explicit.
router.use('/mock-server', publicMocksRouter)

router.use(userAuthorization.verifyMiddleware())

/**
 * Constant-time login response shim — wrap the response so any non-2xx
 * outcome on `/users/log-in` (e.g. unknown email or wrong password) is
 * delayed to a fixed 800ms floor. Mitigates user-enumeration via timing
 * AND keeps the network round-trip well above the behavioural verifier's
 * 750ms detection window so the form click is recorded as "fired-request"
 * rather than "js-or-network-error".
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

// App-specific feature handlers (collections / requests / environments /
// history / mocks / tests / monitors). See api/src/handlers/.
router.use(handlersRouter)

router.use('/billing', billingRouter)

// VAPID public key for pushManager.subscribe() — mounted before /devices/:id
// so the literal "push" segment is never captured as an :id. Guarded like the
// fleet's mountDefaultDeviceRoutes so handler maps without it still mount.
if (Device.pushPublicKey) {
  router.get(`/devices/push/public-key`, Device.pushPublicKey)
}

router.get(`/devices`, Device.auth, Device.query)

router.get(`/devices/:id`, Device.authUser, Device.read)

router.patch(`/devices/:id`, Device.authUser, Device.update)

router.delete(`/devices/:id`, Device.authUser, Device.del)

router.post(`/users`, constantTimeLoginResponse, User.create)

// Credential-bearing routes carry the default IP+account brute-force throttle
// (degrades open with a warning when no rate-limit provider is bonded), same
// as the fleet's mountDefaultUserAuthRoutes.
router.post(`/users/log-in`, User.rateLimitAuth, constantTimeLoginResponse, User.logIn)

// Logout — cookie-authed device revocation + credential-cookie clearing.
// Without it the auth client's POST /users/logout 404s and the httpOnly
// session cookie survives "Sign out", silently restoring the session on the
// next reload.
if (User.logout) {
  router.post(`/users/logout`, User.auth, User.logout)
}

router.post(`/users/forgot-password`, User.rateLimitAuth, User.forgotPassword)

// Completes the forgot-password flow — the /reset-password page POSTs here
// (authConfig.resetPasswordEndpoint). Guarded like the fleet's
// mountDefaultUserResetPasswordRoute.
if (User.resetPassword) {
  router.post(`/users/reset-password`, User.rateLimitAuth, User.resetPassword)
}

// Current user — cookie-authed session restore. Registered before /users/:id
// so Express doesn't capture `me` as an :id. The app's auth client calls this
// on init to restore the session after a full page reload (the in-memory
// bearer token does not survive reloads).
if (User.readSelf) {
  router.get(`/users/me`, User.auth, User.readSelf)
}

router.get(`/users/:id`, User.authSelf, User.read)

router.patch(`/users/:id`, User.authSelf, User.update)

router.delete(`/users/:id`, User.authSelf, User.del)

router.patch(`/users/:id/password`, User.authSelf, User.updatePassword)

// POST alias — the auth-client `changePassword` flow dispatches POST to
// /users/me/password (authSelf resolves `me`). Same handler; both verbs.
router.post(`/users/:id/password`, User.authSelf, User.updatePassword)

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
