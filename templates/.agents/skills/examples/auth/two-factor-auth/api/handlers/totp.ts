import crypto from 'node:crypto'

import type { NextFunction, Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { consume } from '@molecule/api-rate-limit'
import { generateSecret, getUrls, verify } from '@molecule/api-two-factor'

const verifySchema = z.object({
  code: z.string().regex(/^\d{6}$/),
})

const requireAuth = (_req: Request, res: Response, next: NextFunction): void => {
  if (!res.locals.session?.userId) {
    res
      .status(401)
      .json({ error: t('auth.required', undefined, { defaultValue: 'Authentication required' }) })
    return
  }
  next()
}

/**
 * Generates `count` single-use recovery codes.
 * Returns plaintext (shown once to user) + SHA-256 hashes (stored in DB).
 */
function buildRecoveryCodes(count: number): Array<{ plaintext: string; hash: string }> {
  return Array.from({ length: count }, () => {
    const plaintext = crypto
      .randomBytes(10)
      .toString('hex')
      .toUpperCase()
      .replace(/(.{4})/g, '$1-')
      .slice(0, -1)
    const hash = crypto.createHash('sha256').update(plaintext).digest('hex')
    return { plaintext, hash }
  })
}

// SCHEMA: this handler stores TOTP state in NEW columns on the framework `users` table.
// The `users` table already EXISTS, so the "missing migration" verifier (which only flags
// missing TABLES) will NOT remind you — add these columns yourself or every 2FA write 500s:
//   ALTER TABLE users ADD COLUMN totp_secret text;
//   ALTER TABLE users ADD COLUMN totp_secret_pending text;
//   ALTER TABLE users ADD COLUMN totp_recovery_codes text;   -- JSON array of code hashes
//   ALTER TABLE users ADD COLUMN totp_enabled_at text;
//   ALTER TABLE users ADD COLUMN totp_last_time_step integer;  -- replay protection (see /verify)
// (SQLite: text/integer; PostgreSQL: text/timestamptz/jsonb/integer per your dialect — see the
// `database` skill.) Also set the framework's own `users.twoFactorEnabled` boolean so login/UI see it.
const router = Router()

router.post('/enroll', requireAuth, async (_req, res) => {
  const userId = res.locals.session.userId as string
  const user = (await findById('users', userId)) as { id: string; email: string } | null
  if (!user)
    return res
      .status(404)
      .json({ error: t('me.notFound', undefined, { defaultValue: 'User not found' }) })

  const secret = generateSecret()
  // getUrls generates both the otpauth:// key URI and a QR code data URL in one call.
  const { keyUrl, QRImageUrl } = await getUrls({
    secret,
    username: user.email,
    service: process.env.APP_NAME ?? 'MyApp',
  })
  const recoveryCodes = buildRecoveryCodes(10)

  // Store the secret temporarily — it's not "active" until /verify confirms
  // the user can produce a valid code.
  await updateById('users', userId, {
    totp_secret_pending: secret,
    totp_recovery_codes: recoveryCodes.map((c) => c.hash), // store hashes, not plaintext
  })

  res.json({ secret, keyUrl, QRImageUrl, recoveryCodes: recoveryCodes.map((c) => c.plaintext) })
})

router.post('/verify', requireAuth, async (req, res) => {
  const parsed = verifySchema.safeParse(req.body)
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: t('totp.invalidCode', undefined, { defaultValue: 'Invalid code format' }) })
  }
  const userId = res.locals.session.userId as string
  // Rate-limit code attempts BEFORE any DB/verify work — a 6-digit code is only ~1M
  // values, so without a cap an attacker with a valid session brute-forces it within a
  // few validity windows. Per-user key; tune the window/max on the rate-limit provider.
  const rl = await consume(`2fa-verify:${userId}`)
  if (!rl.allowed) {
    return res.status(429).json({
      error: t('totp.rateLimited', undefined, {
        defaultValue: 'Too many attempts — try again shortly.',
      }),
    })
  }
  const user = (await findById('users', userId)) as {
    id: string
    totp_secret?: string
    totp_secret_pending?: string
    totp_last_time_step?: number
  } | null
  if (!user?.totp_secret_pending && !user?.totp_secret) {
    return res
      .status(400)
      .json({ error: t('totp.notEnrolled', undefined, { defaultValue: 'Not enrolled' }) })
  }
  const secret = user.totp_secret_pending ?? user.totp_secret!
  // verify() returns { valid, timeStep, reason } — NOT a boolean. Check `.valid` (negating
  // the object directly is always false → every code passes). Pass `afterTimeStep` (the last
  // accepted time step) so a code CAN'T BE REPLAYED within its 30s window — without it, an
  // intercepted code is reusable, defeating the point of 2FA.
  const { valid, timeStep, reason } = await verify({
    secret,
    token: parsed.data.code,
    afterTimeStep: user.totp_last_time_step,
  })
  if (!valid) {
    return res.status(401).json({
      error:
        reason === 'replay'
          ? t('totp.replay', undefined, {
              defaultValue: 'Code already used — wait for the next one',
            })
          : t('totp.wrongCode', undefined, { defaultValue: 'Wrong code' }),
    })
  }
  // Persist the accepted step so the same/earlier code is rejected next time.
  const updates: Record<string, unknown> = { totp_last_time_step: timeStep }
  if (user.totp_secret_pending) {
    // First-time enrollment — promote pending to active.
    updates.totp_secret = user.totp_secret_pending
    updates.totp_secret_pending = null
    updates.totp_enabled_at = new Date().toISOString()
  }
  await updateById('users', userId, updates)
  res.json({ ok: true })
})

router.post('/disable', requireAuth, async (req, res) => {
  // Require a fresh TOTP code to disable, so a stolen session can't.
  const parsed = verifySchema.safeParse(req.body)
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: t('totp.invalidCode', undefined, { defaultValue: 'Invalid code format' }) })
  }
  const userId = res.locals.session.userId as string
  const rl = await consume(`2fa-disable:${userId}`)
  if (!rl.allowed) {
    return res.status(429).json({
      error: t('totp.rateLimited', undefined, {
        defaultValue: 'Too many attempts — try again shortly.',
      }),
    })
  }
  const user = (await findById('users', userId)) as {
    id: string
    totp_secret?: string
    totp_last_time_step?: number
  } | null
  if (!user?.totp_secret) {
    return res
      .status(400)
      .json({ error: t('totp.notEnabled', undefined, { defaultValue: 'Not enabled' }) })
  }
  // Same replay-protected check as /verify — a code already used elsewhere can't disable 2FA.
  const { valid, reason } = await verify({
    secret: user.totp_secret,
    token: parsed.data.code,
    afterTimeStep: user.totp_last_time_step,
  })
  if (!valid) {
    return res.status(401).json({
      error:
        reason === 'replay'
          ? t('totp.replay', undefined, {
              defaultValue: 'Code already used — wait for the next one',
            })
          : t('totp.wrongCode', undefined, { defaultValue: 'Wrong code' }),
    })
  }
  await updateById('users', userId, {
    totp_secret: null,
    totp_recovery_codes: null,
    totp_enabled_at: null,
    totp_last_time_step: null,
  })
  res.json({ ok: true })
})

export default router
