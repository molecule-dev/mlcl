import { createHash, randomBytes } from 'node:crypto'

import type { NextFunction, Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import {
  create,
  deleteById,
  deleteMany,
  findById,
  findMany,
  updateById,
} from '@molecule/api-database'
import { sendMail } from '@molecule/api-emails'
import { t } from '@molecule/api-i18n'
import { consume } from '@molecule/api-rate-limit'

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000

function hashToken(plain: string): string {
  return createHash('sha256').update(plain).digest('hex')
}

const requireAuth = (_req: Request, res: Response, next: NextFunction): void => {
  if (!res.locals.session?.userId) {
    res
      .status(401)
      .json({ error: t('auth.required', undefined, { defaultValue: 'Authentication required' }) })
    return
  }
  next()
}

const router = Router()

router.post('/request', requireAuth, async (_req, res) => {
  const userId = res.locals.session.userId as string

  // Rate-limit resend requests per user (call consume() in-handler rather than
  // the createRateLimitMiddleware middleware — the framework-agnostic middleware
  // type doesn't match Express's router overloads without an unsafe cast).
  const rl = await consume(`email-verification:${userId}`)
  if (!rl.allowed) {
    res.status(429).json({
      error: t('verifyEmail.rateLimited', undefined, {
        defaultValue: 'Too many requests — try again shortly.',
      }),
    })
    return
  }
  const user = (await findById('users', userId)) as {
    id: string
    email: string
    emailVerified?: boolean
  } | null
  if (!user)
    return res
      .status(404)
      .json({ error: t('me.notFound', undefined, { defaultValue: 'User not found' }) })
  if (user.emailVerified) {
    return res.json({ ok: true, alreadyVerified: true })
  }
  const plain = randomBytes(32).toString('hex')
  const tokenHash = hashToken(plain)
  await create('email_verification_tokens', {
    user_id: userId,
    token_hash: tokenHash,
    expires_at: new Date(Date.now() + TOKEN_TTL_MS).toISOString(),
    created_at: new Date().toISOString(),
  })
  // SITE_ORIGIN is the app's public origin (the framework's password-reset emails +
  // the api-patterns env table use it). An email link MUST be absolute — a bare
  // `/verify?...` is unreachable from an inbox — so never leave the origin empty.
  const origin = process.env.SITE_ORIGIN || 'http://localhost:3000'
  const link = `${origin}/verify?token=${encodeURIComponent(plain)}`
  const from = process.env.EMAIL_FROM ?? `noreply@${process.env.APP_DOMAIN ?? 'example.com'}`
  try {
    await sendMail({
      from,
      to: user.email,
      subject: t('verifyEmail.subject', undefined, { defaultValue: 'Verify your email' }),
      text: t(
        'verifyEmail.body',
        { link },
        {
          defaultValue: 'Click here to verify your email (expires in 24 hours):\n\n{{link}}',
        },
      ),
    })
  } catch (error) {
    // The provider refused the message, so this link reaches nobody — and the
    // row backing it would sit in the table (undelivered, unusable) for every
    // failed resend, one per attempt. Roll it back: a request that fails leaves
    // the database as it found it, and the NEXT request mints a fresh token
    // instead of stacking orphans.
    try {
      await deleteMany('email_verification_tokens', [
        { field: 'token_hash', operator: '=', value: tokenHash },
      ])
    } catch (cleanupError) {
      // Best-effort: the send failure is what the caller must see. An orphan
      // row is inert (the token was never delivered and expires on its TTL), so
      // log it rather than replacing the real error with the cleanup's.
      console.error('verify-email: could not drop the token for a failed send', {
        userId,
        cleanupError,
      })
    }
    throw error
  }
  // The send succeeded, so THIS link supersedes every earlier one. Nothing else
  // ever reclaims those rows: the TTL gates acceptance, it does not delete (an
  // expired row goes away only when someone visits that exact link), so the
  // table held one permanent row per resend request ever made — the rate limit
  // above bounds the RATE of resends, never the total. Deleting the user's
  // other tokens here leaves at most ONE outstanding link per user, and the
  // just-minted one is spared by the `token_hash != …` condition.
  //
  // Housekeeping only, and AFTER the mail went out: the link is already
  // delivered, so a store failure here must not turn a successful send into an
  // error the page reports as "could not send" (the row that survives is inert
  // — it expires on its TTL).
  try {
    await deleteMany('email_verification_tokens', [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'token_hash', operator: '!=', value: tokenHash },
    ])
  } catch (cleanupError) {
    console.error('verify-email: could not drop the superseded verification tokens', {
      userId,
      cleanupError,
    })
  }
  res.json({ ok: true })
})

const verifySchema = z.object({
  token: z.string().min(20),
})

router.get('/', async (req, res) => {
  const parsed = verifySchema.safeParse(req.query)
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: t('verifyEmail.bad', undefined, { defaultValue: 'Bad token' }) })
  }
  const [tokenRow] = (await findMany('email_verification_tokens', {
    where: [{ field: 'token_hash', operator: '=', value: hashToken(parsed.data.token) }],
    limit: 1,
  })) as { id: string; user_id: string; expires_at: string }[]
  if (!tokenRow) {
    return res
      .status(404)
      .json({ error: t('verifyEmail.notFound', undefined, { defaultValue: 'Link not found' }) })
  }
  if (new Date(tokenRow.expires_at) < new Date()) {
    // Clearing an expired token is housekeeping, the same rule the used-token
    // delete below follows — and the visitor must be told the link EXPIRED
    // whether or not the clear lands. Unguarded, a transient store failure
    // rejected the handler: the page read it as a 5xx and rendered "Could not
    // check this link" for a link that is simply past its TTL. The row is inert
    // either way (it is already expired), and the next visit retries the clear.
    try {
      await deleteById('email_verification_tokens', tokenRow.id)
    } catch (cleanupError) {
      console.error('verify-email: could not drop the expired verification token', {
        userId: tokenRow.user_id,
        tokenId: tokenRow.id,
        cleanupError,
      })
    }
    return res
      .status(410)
      .json({ error: t('verifyEmail.expired', undefined, { defaultValue: 'Link expired' }) })
  }
  // Set the framework's existing `emailVerified` boolean (users.emailVerified) — it's what
  // the user model returns and what login/UI checks read, so verification actually takes
  // effect. Do NOT invent an `email_verified_at` column: it isn't on the users table (the
  // write would 500), and the framework would still see the user as unverified.
  await updateById('users', tokenRow.user_id, { emailVerified: true })
  // The verification above is THIS route's outcome; clearing the single-use
  // token is housekeeping. Letting the clear's failure reject the handler turned
  // a verified account into a 500 — the visitor was told the link did not work
  // while the account had just been verified — and the two writes cannot be one
  // transaction here (handlers go through the abstract DataStore, which offers
  // none). A row this delete cannot remove is inert: the user is verified
  // either way, a later visit to the same link re-runs the delete (the row is
  // still found by hash and is idempotent), and it expires on its TTL. So log
  // the cleanup failure and still report the verification that happened.
  try {
    await deleteById('email_verification_tokens', tokenRow.id)
  } catch (cleanupError) {
    console.error('verify-email: could not drop the used verification token', {
      userId: tokenRow.user_id,
      tokenId: tokenRow.id,
      cleanupError,
    })
  }
  res.json({ ok: true })
})

export default router
