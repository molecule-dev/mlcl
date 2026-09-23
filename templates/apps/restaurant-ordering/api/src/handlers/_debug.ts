/**
 * Dev-only debug endpoints. Mounted under `/api/users/reset-token` (and
 * any future siblings) so e2e tests can introspect state the production
 * app never exposes. SECURITY: this returns a user's live password-reset token
 * (an account-takeover primitive), so the router is DISABLED by default and only
 * serves when `ENABLE_E2E_TEST_ENDPOINTS=true` is explicitly set (fail-closed).
 * Gating on NODE_ENV was fail-OPEN — the scaffold ships NODE_ENV=development, so
 * the endpoint was live out of the box. Never set the flag in production.
 *
 * Currently exposes:
 *   GET /users/reset-token?email=<email>
 *     → 200 { token: string } with the RAW reset token captured from the
 *       outbound reset email (see `lib/dev-email-capture.ts`), else 404.
 *       The user resource persists only sha256(token) in `usersSecrets`, so
 *       the secrets table can never hand back a usable token — the captured
 *       email IS the handoff a real user gets by reading their inbox.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'

import { getCapturedResetToken } from '../lib/dev-email-capture.js'

const router = Router()

router.use((_req: Request, _res: Response, next) => {
  // Fail CLOSED: disabled unless explicitly opted in. [P5TPL-1]
  // When disabled, skip OUT of this debug router (`next('router')`) instead of
  // ending the response — this router is mounted at `/users`, so a 404 here
  // would swallow the ENTIRE /api/users subtree (signup, login, CRUD) whenever
  // the flag is unset. The debug route itself stays dark either way: with the
  // guard skipping, /users/reset-token falls through to the authed default
  // user routes, which never expose reset tokens.
  if (process.env.ENABLE_E2E_TEST_ENDPOINTS !== 'true') {
    next('router')
    return
  }
  next()
})

router.get('/reset-token', async (req: Request, res: Response) => {
  const email = typeof req.query.email === 'string' ? req.query.email : null
  if (!email) {
    res.status(400).json({ error: 'email query param is required' })
    return
  }
  const token = getCapturedResetToken(email)
  if (!token) {
    res.status(404).json({
      error:
        'no reset token captured — a POST /users/forgot-password must have run with the email bond armed (ENABLE_E2E_TEST_ENDPOINTS=true)',
    })
    return
  }
  res.json({ token })
})

export default router
