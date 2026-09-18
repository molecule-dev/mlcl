/**
 * Reset-password handler — completes the forgot-password flow.
 *
 * Looks up the issued reset token's SHA-256 digest in `usersSecrets`,
 * verifies it matches and is within the 1-hour validity window, then hashes
 * the new password and writes it. The token is cleared as part of the same
 * write so it cannot be replayed. Constant-shape responses prevent
 * enumeration.
 */

import crypto from 'node:crypto'

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { findById, findOne, updateById } from '@molecule/api-database'
import { hash } from '@molecule/api-password'

const router = Router()

const resetSchema = z.object({
  token: z.string().min(8),
  password: z.string().min(8).max(1024),
})

const ONE_HOUR_MS = 60 * 60 * 1000

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
  return crypto.createHash('sha256').update(token).digest('hex')
}

function reject(res: Response, errorKey = 'auth.resetPassword.invalidToken'): void {
  res.status(400).json({
    error: 'The reset link is invalid or has expired. Please request a new one.',
    errorKey,
  })
}

router.post('/', async (req: Request, res: Response) => {
  const parse = resetSchema.safeParse(req.body)
  if (!parse.success) {
    reject(res, 'auth.resetPassword.invalidInput')
    return
  }
  const { token, password } = parse.data

  // The store holds the digest, not the raw emailed token — hash the incoming
  // token before the lookup or a genuinely emailed token can never match (and
  // a DB reader must not be able to replay the stored digest as the token).
  const tokenHash = hashResetToken(token)

  const secret = await findOne<{
    id: string
    passwordResetToken?: string | null
    passwordResetTokenAt?: string | Date | null
  }>('usersSecrets', [{ field: 'passwordResetToken', operator: '=', value: tokenHash }])

  if (!secret || !secret.passwordResetToken || !secret.passwordResetTokenAt) {
    reject(res)
    return
  }

  const a = Buffer.from(tokenHash, 'utf-8')
  const b = Buffer.from(secret.passwordResetToken, 'utf-8')
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    reject(res)
    return
  }

  const tokenAge = Date.now() - new Date(secret.passwordResetTokenAt as string | Date).getTime()
  if (tokenAge > ONE_HOUR_MS) {
    reject(res)
    return
  }

  const user = await findById<{ id: string }>('users', secret.id)
  if (!user) {
    reject(res)
    return
  }

  const passwordHash = await hash(password)
  await updateById('usersSecrets', secret.id, {
    passwordHash,
    passwordResetToken: null,
    passwordResetTokenAt: null,
  })

  res.json({ success: true })
})

export default router
