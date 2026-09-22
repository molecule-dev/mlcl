import { createHash } from 'node:crypto'

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getLogger } from '@molecule/api-bond'
import { findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { hash } from '@molecule/api-password'

const logger = getLogger()

const router = Router()

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(1024),
})

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000

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

/**
 * Public endpoint that consumes a password-reset token issued by
 * `POST /api/users/forgot-password` and stored on `usersSecrets.passwordResetToken`.
 * The molecule resource-user package only exposes the forgot/update halves;
 * this completes the loop so the `/reset-password?token=…` UI is functional.
 *
 * Tokens are valid for one hour from issuance. The incoming token is hashed
 * before the `usersSecrets` lookup — the store holds only `sha256(token)`, so
 * the raw emailed token is never persisted and a DB read yields no replayable
 * credential. We never reveal whether a token matched a real user — the same
 * 400 is returned for both unknown tokens and malformed bodies, mirroring
 * forgot-password's no-enumeration behaviour.
 */
router.post('/reset-password', async (req: Request, res: Response) => {
  const parsed = resetPasswordSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('auth.resetPassword.invalid', {}, { defaultValue: 'Invalid reset request' }),
    })
  }

  const { token, password } = parsed.data

  try {
    const matches = await findMany<{
      id: string
      passwordResetToken?: string | null
      passwordResetTokenAt?: string | Date | null
    }>('usersSecrets', {
      where: [{ field: 'passwordResetToken', operator: '=', value: hashResetToken(token) }],
      limit: 1,
    })

    const secret = matches[0]
    if (!secret) {
      return res.status(400).json({
        error: t(
          'auth.resetPassword.invalid',
          {},
          { defaultValue: 'Invalid or expired reset token' },
        ),
      })
    }

    const issuedAt = secret.passwordResetTokenAt
      ? new Date(secret.passwordResetTokenAt).getTime()
      : 0
    if (!issuedAt || Date.now() - issuedAt > RESET_TOKEN_TTL_MS) {
      return res.status(400).json({
        error: t(
          'auth.resetPassword.expired',
          {},
          { defaultValue: 'Invalid or expired reset token' },
        ),
      })
    }

    const passwordHash = await hash(password)
    await updateById('usersSecrets', secret.id, {
      passwordHash,
      passwordResetToken: null,
      passwordResetTokenAt: null,
    })

    return res.status(200).json({ success: true })
  } catch (error) {
    // DB or hash failure — surface a generic 500; details are not exposed to
    // the client, but they ARE logged with the domain event name so a failing
    // reset flow is diagnosable.
    logger.error('auth.resetPassword', error)
    return res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
