/**
 * Local auth handler — covers the *unauthenticated* token-based password
 * reset flow that consumes the `passwordResetToken` issued by molecule's
 * `POST /api/users/forgot-password`.
 *
 * The molecule `users` resource issues a reset token + emails it, and
 * `POST /api/users/log-in` will accept that token to authenticate, but
 * there is no first-class endpoint that says "I have this token; here's
 * the new password — change it." That gap leaves the `/reset-password`
 * page permanently dead-end, so we add the missing endpoint here as a
 * per-app handler.
 *
 * Routes mounted under `/api/auth`:
 *
 *   POST /reset-password  body: { token, password } → { success: true }
 *
 * Errors are surfaced as real status codes (400 invalid/expired token,
 * 422 weak password) — never silently swallowed. We hash via the bonded
 * `@molecule/api-password` so the new credentials match the format
 * created by `POST /api/users` and accepted by `POST /api/users/log-in`.
 * The incoming reset token is hashed before the `usersSecrets` lookup —
 * molecule stores only `sha256(token)`, so the raw emailed token is never
 * persisted and a DB read yields no replayable credential.
 */

import { createHash } from 'node:crypto'

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { findOne, updateById, type WhereCondition } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'
import { hash } from '@molecule/api-password'

const router = Router()

/** Reset-token max age — matches molecule's logIn token-window so neither
 * code path lets stale tokens succeed. */
const TOKEN_TTL_MS = 1000 * 60 * 60

/**
 * Hash a reset token for lookup — identical to molecule's
 * `@molecule/api-resource-user` `src/utilities/hashResetToken.ts` (not
 * exported from the package barrel, so inlined here as the source of truth).
 * The pinned resource-user forget-password handler stores `sha256(token)`,
 * never the raw emailed token: a DB read must not yield a replayable
 * takeover credential. The token is high-entropy and single-use, so a fast
 * unsalted hash is sufficient — this is not a password.
 */
function hashResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

const resetSchema = z.object({
  token: z.string().min(16, 'Reset token is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(1024, 'Password must be at most 1024 characters'),
})

interface UserSecretsRow {
  id: string
  passwordHash?: string | null
  passwordResetToken?: string | null
  passwordResetTokenAt?: string | null
}

router.post('/reset-password', validateBody(resetSchema), async (req: Request, res: Response) => {
  const { token, password } = req.body as z.infer<typeof resetSchema>

  // The store holds sha256(token), never the raw emailed token — hash the
  // incoming token before the lookup or a genuinely emailed token can never
  // match (and a DB reader must not be able to replay the stored digest).
  const where: WhereCondition[] = [
    { field: 'passwordResetToken', operator: '=', value: hashResetToken(token) },
  ]
  const secrets = await findOne<UserSecretsRow>('usersSecrets', where)

  if (!secrets) {
    res.status(400).json({
      error: t(
        'auth.error.invalidResetToken',
        {},
        { defaultValue: 'Invalid or expired reset token' },
      ),
      errorKey: 'auth.error.invalidResetToken',
    })
    return
  }

  if (!secrets.passwordResetTokenAt) {
    res.status(400).json({
      error: t(
        'auth.error.invalidResetToken',
        {},
        { defaultValue: 'Invalid or expired reset token' },
      ),
      errorKey: 'auth.error.invalidResetToken',
    })
    return
  }

  const issuedAt = Date.parse(secrets.passwordResetTokenAt)
  if (Number.isNaN(issuedAt) || Date.now() - issuedAt >= TOKEN_TTL_MS) {
    res.status(400).json({
      error: t(
        'auth.error.expiredResetToken',
        {},
        { defaultValue: 'Reset token has expired — request a new one' },
      ),
      errorKey: 'auth.error.expiredResetToken',
    })
    return
  }

  const passwordHash = await hash(password)
  await updateById('usersSecrets', secrets.id, {
    passwordHash,
    passwordResetToken: null,
    passwordResetTokenAt: null,
  })

  res.status(200).json({ success: true })
})

export default router
