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
 *     → 200 { token: string } — mints a FRESH reset token and returns the
 *       RAW value once, standing in for the email inbox. Only the sha256
 *       hash is persisted on the user's `usersSecrets` row (exactly what
 *       forgotPassword does before emailing), so a DB read still never
 *       yields a usable token; the raw value lives solely in the test's
 *       hands, like a delivered email. 404 when the user does not exist.
 *
 * @module
 */

import crypto from 'node:crypto'

import { type Request, type Response, Router } from 'express'

import { findOne, updateById } from '@molecule/api-database'

const router = Router()

/**
 * Mirror of the user resource's `hashResetToken` — sha256 hex digest. The
 * stored value must be the digest of the returned raw token or the reset
 * endpoint (which hashes the submitted token before lookup) will reject it.
 */
function hashResetToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

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
  // Mint fresh + store only the digest, so handing the raw token to the test
  // does not downgrade the storage model: returning the STORED value instead
  // returned the sha256 hash (the raw token is never persisted), and the
  // reset endpoint then hashed the hash and 401'd — the round-trip could
  // never succeed.
  const rawToken = crypto.randomBytes(32).toString('hex')
  await updateById('usersSecrets', user.id, {
    passwordResetToken: hashResetToken(rawToken),
    passwordResetTokenAt: new Date().toISOString(),
  })
  res.json({ token: rawToken })
})

export default router
