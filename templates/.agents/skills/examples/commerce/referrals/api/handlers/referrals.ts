import { randomBytes } from 'node:crypto'

import type { NextFunction, Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { create, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

const requireAuth = (_req: Request, res: Response, next: NextFunction): void => {
  if (!res.locals.session?.userId) {
    res
      .status(401)
      .json({ error: t('auth.required', undefined, { defaultValue: 'Authentication required' }) })
    return
  }
  next()
}

function generateCode(): string {
  // Short, human-readable, low-collision: 6 base36 chars.
  return randomBytes(4).toString('hex').slice(0, 6).toUpperCase()
}

// SCHEMA: this stores each user's code in a NEW `referral_code` column on the framework
// `users` table (plus a `referrals` table for redemptions — that one the "missing migration"
// verifier WILL catch, since it's a new table). `users` already exists, so the column is
// NOT caught — add it or /code 500s:
//   ALTER TABLE users ADD COLUMN referral_code text;
//   CREATE UNIQUE INDEX users_referral_code_idx ON users (referral_code);  -- codes are unique
const router = Router()

router.get('/code', requireAuth, async (_req, res) => {
  const userId = res.locals.session.userId as string
  const user = (await findById('users', userId)) as { id: string; referral_code?: string } | null
  if (!user)
    return res
      .status(404)
      .json({ error: t('me.notFound', undefined, { defaultValue: 'User not found' }) })

  if (user.referral_code) {
    return res.json({ code: user.referral_code })
  }

  // Lazily mint a code on first request.
  const code = generateCode()
  await updateById('users', userId, { referral_code: code })
  res.json({ code })
})

const redeemSchema = z.object({
  code: z.string().min(4).max(16),
})

router.post('/redeem', requireAuth, async (req, res) => {
  const parsed = redeemSchema.safeParse(req.body)
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: t('referrals.invalid', undefined, { defaultValue: 'Invalid code' }) })
  }
  const referredId = res.locals.session.userId as string

  const [referrer] = (await findMany('users', {
    where: [{ field: 'referral_code', operator: '=', value: parsed.data.code.toUpperCase() }],
    limit: 1,
  })) as { id: string }[]

  if (!referrer) {
    return res
      .status(404)
      .json({ error: t('referrals.notFound', undefined, { defaultValue: 'Code not found' }) })
  }
  if (referrer.id === referredId) {
    return res.status(400).json({
      error: t('referrals.selfReferral', undefined, { defaultValue: 'Cannot refer yourself' }),
    })
  }

  // Insert the pending referral. Unique index on (referrer_id, referred_id)
  // prevents duplicates if the user POSTs twice.
  try {
    await create('referrals', {
      referrer_id: referrer.id,
      referred_id: referredId,
      status: 'pending',
      created_at: new Date().toISOString(),
    })
  } catch (err) {
    return res.status(409).json({
      error: t('referrals.alreadyRedeemed', undefined, { defaultValue: 'Already redeemed' }),
    })
  }
  res.status(201).json({ ok: true, status: 'pending' })
})

export default router
