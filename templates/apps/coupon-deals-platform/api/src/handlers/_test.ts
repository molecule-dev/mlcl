/**
 * Dev-only test endpoints. Mounted under `/api/_test/*` so e2e tests
 * (and only e2e tests) can introspect state the production app never
 * exposes. SECURITY: this returns a user's live password-reset token (an
 * account-takeover primitive), so the router is DISABLED by default and only
 * serves when `ENABLE_E2E_TEST_ENDPOINTS=true` is explicitly set (fail-closed).
 * Gating on NODE_ENV was fail-OPEN — the scaffold ships NODE_ENV=development, so
 * the endpoint was live out of the box. Never set the flag in production.
 *
 * Currently exposes:
 *   GET /_test/last-reset-token?email=<email>
 *     → 200 { token: string } if a reset token is currently stored on
 *       the user's `usersSecrets` row, else 404. Tests use this to simulate
 *       the email-delivered token handoff without needing a real inbox.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'

import { findOne } from '@molecule/api-database'

const router = Router()

router.use((_req: Request, res: Response, next) => {
  // Fail CLOSED: disabled unless explicitly opted in. [P5TPL-1]
  if (process.env.ENABLE_E2E_TEST_ENDPOINTS !== 'true') {
    res.status(404).end()
    return
  }
  next()
})

router.get('/last-reset-token', async (req: Request, res: Response) => {
  const email = typeof req.query.email === 'string' ? req.query.email : null
  if (!email) {
    res.status(400).json({ error: 'email query param is required' })
    return
  }
  const user = await findOne<{ id: string }>('users', [
    { field: 'email', operator: '=', value: email },
  ])
  if (!user) {
    res.status(404).json({ error: 'user not found' })
    return
  }
  const secret = await findOne<{
    id: string
    passwordResetToken?: string | null
  }>('usersSecrets', [{ field: 'id', operator: '=', value: user.id }])
  if (!secret || !secret.passwordResetToken) {
    res.status(404).json({ error: 'no reset token issued' })
    return
  }
  res.json({ token: secret.passwordResetToken })
})

export default router
