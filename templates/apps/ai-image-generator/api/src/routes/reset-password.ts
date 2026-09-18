/**
 * Password reset confirmation endpoint.
 *
 * The forgot-password flow generates a `passwordResetToken` and stores only
 * its SHA-256 digest on `usersSecrets` (see
 * `@molecule/api-resource-user/handlers/forgotPassword`).
 * The user clicks the email link to `/reset-password?token=...`, fills in a
 * new password, and the frontend posts `{ token, password }` to this endpoint.
 *
 * The request is intentionally unauthenticated — knowledge of the token is
 * the credential. The incoming token is hashed before the `usersSecrets`
 * lookup (the store holds only `sha256(token)`), tokens older than 1 hour
 * are rejected.
 *
 * @module
 */

import { createHash } from 'node:crypto'

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'
import { hash } from '@molecule/api-password'

const router = Router()

const TOKEN_TTL_MS = 60 * 60 * 1000

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

const confirmSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(1024),
})

interface UserSecretsRow {
  id: string
  passwordResetToken: string | null
  passwordResetTokenAt: string | null
}

router.post('/reset-password', validateBody(confirmSchema), async (req: Request, res: Response) => {
  const { token, password } = req.body as { token: string; password: string }

  const secrets = await findOne<UserSecretsRow>('usersSecrets', [
    { field: 'passwordResetToken', operator: '=', value: hashResetToken(token) },
  ])

  if (!secrets || !secrets.passwordResetTokenAt) {
    return res.status(400).json({
      error: t('user.error.invalidResetToken', undefined, {
        defaultValue: 'Invalid or expired reset token',
      }),
      errorKey: 'user.error.invalidResetToken',
    })
  }

  const issuedAt = Date.parse(secrets.passwordResetTokenAt)
  if (!Number.isFinite(issuedAt) || Date.now() - issuedAt > TOKEN_TTL_MS) {
    return res.status(400).json({
      error: t('user.error.invalidResetToken', undefined, {
        defaultValue: 'Invalid or expired reset token',
      }),
      errorKey: 'user.error.invalidResetToken',
    })
  }

  const passwordHash = await hash(password)
  await updateById('usersSecrets', secrets.id, {
    passwordHash,
    passwordResetToken: null,
    passwordResetTokenAt: null,
  })

  return res.status(200).json({ success: true })
})

export default router
