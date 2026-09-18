import { createHash, randomBytes } from 'node:crypto'

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { get } from '@molecule/api-bond'
import { userAuthorization } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany } from '@molecule/api-database'
import { sendMail } from '@molecule/api-emails'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'
import { consume } from '@molecule/api-rate-limit'
import type { MoleculeRequest } from '@molecule/api-resource'

const router = Router()

/** Token lifetime — 15 minutes is standard for login links. */
const TOKEN_TTL_MS = 15 * 60 * 1000

/** Hash a plaintext token so we never store it in clear text. */
function hashToken(plain: string): string {
  return createHash('sha256').update(plain).digest('hex')
}

const requestLinkSchema = z.object({
  email: z.string().email(),
})

/**
 * POST /auth/magic-link/request
 *
 * Accepts an email address, issues a single-use login token, and emails the link.
 * Always returns 202 so callers cannot enumerate registered addresses.
 *
 * Rate-limited to 3 requests per email per minute.
 */
router.post('/request', validateBody(requestLinkSchema), async (req: Request, res: Response) => {
  const { email } = req.body as z.infer<typeof requestLinkSchema>

  // Rate-limit: 3 requests per email per minute.
  const rlKey = `magic-link:${email}`
  const rl = await consume(rlKey)
  if (!rl.allowed) {
    res.status(429).json({
      error: t('magicLink.request.rateLimited', undefined, {
        defaultValue: 'Too many requests — try again shortly.',
      }),
      errorKey: 'magicLink.request.rateLimited',
    })
    return
  }

  // Look up the user — intentionally do NOT reveal whether the address exists.
  const [user] = (await findMany('users', {
    where: [{ field: 'email', operator: '=', value: email }],
    limit: 1,
  })) as { id: string; email: string }[]

  if (user) {
    const plain = randomBytes(32).toString('hex')
    await create('magic_link_tokens', {
      user_id: user.id,
      token_hash: hashToken(plain),
      expires_at: new Date(Date.now() + TOKEN_TTL_MS).toISOString(),
      created_at: new Date().toISOString(),
    })

    // Absolute link straight to the API verify route (the API router is
    // mounted at `/api`, this router at `/auth/magic-link`). The browser
    // hits it directly, so it MUST include `/api` and the full sub-path —
    // it is not a frontend page.
    // SITE_ORIGIN is the app's public origin (the framework's password-reset emails +
    // the api-patterns env table use it). An email link MUST be absolute — a bare
    // `/api/auth/...` path is unreachable from an inbox — so never leave the origin empty.
    const origin = process.env.SITE_ORIGIN || 'http://localhost:3000'
    const link = `${origin}/api/auth/magic-link/verify?token=${encodeURIComponent(plain)}`
    await sendMail({
      // EMAIL_FROM is the canonical sender var; the default DERIVES from MAILGUN_DOMAIN
      // (Mailgun rejects a `from` whose domain isn't your verified sending domain).
      from: process.env.EMAIL_FROM ?? `no-reply@${process.env.MAILGUN_DOMAIN ?? 'localhost'}`,
      to: user.email,
      subject: t('magicLink.email.subject', undefined, { defaultValue: 'Your login link' }),
      text: t(
        'magicLink.email.body',
        { link },
        {
          defaultValue:
            'Click the link below to log in (expires in 15 minutes):\n\n{{link}}\n\nIf you did not request this, ignore this email.',
        },
      ),
    })
  }

  // Always 202 — do not reveal whether the email is registered.
  res.status(202).json({
    message: t('magicLink.request.sent', undefined, {
      defaultValue: 'If that email is registered, a login link is on its way.',
    }),
  })
})

/**
 * GET /auth/magic-link/verify?token=...
 *
 * Validates the token, deletes it (single-use), creates a JWT session cookie,
 * and redirects to /.
 */
router.get('/verify', async (req: MoleculeRequest, res: Response) => {
  const plain = typeof req.query.token === 'string' ? req.query.token : null
  if (!plain) {
    res.status(400).json({
      error: t('magicLink.verify.badToken', undefined, {
        defaultValue: 'Missing or invalid token',
      }),
      errorKey: 'magicLink.verify.badToken',
    })
    return
  }

  const [tokenRow] = (await findMany('magic_link_tokens', {
    where: [{ field: 'token_hash', operator: '=', value: hashToken(plain) }],
    limit: 1,
  })) as { id: string; user_id: string; expires_at: string }[]

  if (!tokenRow) {
    res.status(404).json({
      error: t('magicLink.verify.notFound', undefined, {
        defaultValue: 'Link not found or already used',
      }),
      errorKey: 'magicLink.verify.notFound',
    })
    return
  }

  if (new Date(tokenRow.expires_at) < new Date()) {
    await deleteById('magic_link_tokens', tokenRow.id)
    res.status(410).json({
      error: t('magicLink.verify.expired', undefined, {
        defaultValue: 'Link expired — request a new one',
      }),
      errorKey: 'magicLink.verify.expired',
    })
    return
  }

  // Single-use: delete before issuing session so a second click is rejected.
  await deleteById('magic_link_tokens', tokenRow.id)

  const user = (await findById('users', tokenRow.user_id)) as { id: string; email: string } | null
  if (!user) {
    res.status(404).json({
      error: t('magicLink.verify.userGone', undefined, { defaultValue: 'Account not found' }),
      errorKey: 'magicLink.verify.userGone',
    })
    return
  }

  // Log the user in via the SAME session mechanism the rest of the app uses:
  // create a device, then userAuthorization.set() signs the { userId, deviceId }
  // JWT and writes the httpOnly `token` cookie that the global verifyMiddleware
  // reads. Signing a bespoke cookie by hand would NOT be recognized — the app
  // would treat the user as logged out on the very next request.
  const deviceId = await get<{
    createOrUpdate(userId: string, deviceName: string): Promise<string | null>
  }>('device')?.createOrUpdate(user.id, 'Magic link')

  if (!deviceId) {
    res.status(500).json({
      error: t('magicLink.verify.sessionFailed', undefined, {
        defaultValue: 'Could not start your session — request a new link.',
      }),
      errorKey: 'magicLink.verify.sessionFailed',
    })
    return
  }

  userAuthorization.set(req, res, { userId: user.id, deviceId })
  res.redirect('/')
})

export default router
