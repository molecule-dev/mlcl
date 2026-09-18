import { createHash, randomBytes } from 'node:crypto'

import type { NextFunction, Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { sendMail } from '@molecule/api-emails'
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
  await create('email_verification_tokens', {
    user_id: userId,
    token_hash: hashToken(plain),
    expires_at: new Date(Date.now() + TOKEN_TTL_MS).toISOString(),
    created_at: new Date().toISOString(),
  })
  // SITE_ORIGIN is the app's public origin (the framework's password-reset emails +
  // the api-patterns env table use it). An email link MUST be absolute — a bare
  // `/verify?...` is unreachable from an inbox — so never leave the origin empty.
  const origin = process.env.SITE_ORIGIN || 'http://localhost:3000'
  const link = `${origin}/verify?token=${encodeURIComponent(plain)}`
  const from = process.env.EMAIL_FROM ?? `noreply@${process.env.APP_DOMAIN ?? 'example.com'}`
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
    await deleteById('email_verification_tokens', tokenRow.id)
    return res
      .status(410)
      .json({ error: t('verifyEmail.expired', undefined, { defaultValue: 'Link expired' }) })
  }
  // Set the framework's existing `emailVerified` boolean (users.emailVerified) — it's what
  // the user model returns and what login/UI checks read, so verification actually takes
  // effect. Do NOT invent an `email_verified_at` column: it isn't on the users table (the
  // write would 500), and the framework would still see the user as unverified.
  await updateById('users', tokenRow.user_id, { emailVerified: true })
  await deleteById('email_verification_tokens', tokenRow.id)
  res.json({ ok: true })
})

export default router
