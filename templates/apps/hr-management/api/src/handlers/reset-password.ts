/**
 * Public POST /api/users/reset-password — finalises a password reset
 * triggered by `forgotPassword`. Validates the reset token TTL, hashes
 * the new password, and clears the reset token so it can't be reused.
 *
 * Modeled after the canonical implementation in
 * mlcl/templates/apps/ai-customer-service-bot/api/src/handlers/reset-password.ts.
 *
 * @module
 */

import { createHash } from 'node:crypto'

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { hash } from '@molecule/api-password'

const router = Router()

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

const resetPasswordSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8).max(1024),
})

interface UserSecretsRow {
  id: string
  passwordHash?: string
  passwordResetToken?: string | null
  passwordResetTokenAt?: string | null
}

const RESET_TOKEN_TTL_MS = 1000 * 60 * 60 * 24

router.post('/', async (req: Request, res: Response) => {
  const parsed = resetPasswordSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: t('user.error.resetPasswordInvalid', {}, { defaultValue: 'Invalid reset request' }),
    })
    return
  }
  const { token, password } = parsed.data

  // The store holds sha256(token), never the raw emailed token — hash the
  // incoming token before the lookup or a genuinely emailed token can never
  // match (and a DB reader must not be able to replay the stored digest).
  const secrets = await findOne<UserSecretsRow>('usersSecrets', [
    { field: 'passwordResetToken', operator: '=', value: hashResetToken(token) },
  ])

  if (!secrets || !secrets.passwordResetTokenAt) {
    res.status(400).json({
      error: t(
        'user.error.resetTokenInvalid',
        {},
        {
          defaultValue: 'Reset link is invalid or expired',
        },
      ),
    })
    return
  }

  const issuedAt = new Date(secrets.passwordResetTokenAt).getTime()
  if (Number.isNaN(issuedAt) || Date.now() - issuedAt > RESET_TOKEN_TTL_MS) {
    res.status(400).json({
      error: t('user.error.resetTokenExpired', {}, { defaultValue: 'Reset link has expired' }),
    })
    return
  }

  const passwordHash = await hash(password)
  await updateById('usersSecrets', secrets.id, {
    passwordHash,
    passwordResetToken: null,
    passwordResetTokenAt: null,
  })

  res.json({ success: true })
})

export default router
