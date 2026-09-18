import { createHash } from 'node:crypto'

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'
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

/**
 * Reset password using a token issued by /users/forgot-password.
 *
 * The molecule resource user package ships forgotPassword (which writes a
 * `passwordResetToken` to the usersSecrets row) but stops short of a
 * token-redeeming endpoint, leaving every flagship to wire its own. We
 * mount this at `/users/reset-password` so the auction-platform reset
 * flow has a real backend.
 *
 * The handler is deliberately strict:
 *   - Missing / empty token → 400
 *   - Unknown / expired token → 400 (NOT 404 — the spec contract is 400)
 *   - Password shorter than 8 chars → 400
 *   - Successful reset → 200, the user can immediately log in with the
 *     new password
 */
const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(1024),
})

interface UserSecretsRow {
  id: string
  passwordResetToken: string | null
  passwordResetTokenAt: string | null
}

const TOKEN_TTL_MS = 60 * 60 * 1000

router.post(
  '/reset-password',
  validateBody(resetPasswordSchema),
  async (req: Request, res: Response) => {
    const body = req.body as z.infer<typeof resetPasswordSchema>
    // The store holds sha256(token), never the raw emailed token — hash the
    // incoming token before the lookup or a genuinely emailed token can never
    // match (and a DB reader must not be able to replay the stored digest).
    const row = await findOne<UserSecretsRow>('usersSecrets', [
      { field: 'passwordResetToken', operator: '=', value: hashResetToken(body.token) },
    ])
    if (!row || !row.passwordResetTokenAt) {
      res.status(400).json({
        error: t(
          'auth.resetPassword.invalidToken',
          {},
          { defaultValue: 'Invalid or expired reset token' },
        ),
        errorKey: 'auth.resetPassword.invalidToken',
      })
      return
    }
    const issued = Date.parse(row.passwordResetTokenAt)
    if (!Number.isFinite(issued) || Date.now() - issued > TOKEN_TTL_MS) {
      res.status(400).json({
        error: t(
          'auth.resetPassword.invalidToken',
          {},
          { defaultValue: 'Invalid or expired reset token' },
        ),
        errorKey: 'auth.resetPassword.invalidToken',
      })
      return
    }
    const passwordHash = await hash(body.password)
    await updateById('usersSecrets', row.id, {
      passwordHash,
      passwordResetToken: null,
      passwordResetTokenAt: null,
    })
    res.status(200).json({ success: true })
  },
)

export default router
