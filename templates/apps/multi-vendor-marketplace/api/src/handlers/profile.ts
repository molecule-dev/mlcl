/**
 * Profile — buyer profile + preference store backed by `users.oauthData.mvm`.
 *
 * - GET   /profile/me   — user identity + preferences (addresses, notification
 *                          prefs, payout account if a vendor)
 * - PATCH /profile/me   — partial update of name and/or any preference subset
 *
 * The `oauthData.mvm` jsonb blob is the per-app preference bag — no migration
 * needed when settings shift. The User core resource only accepts
 * username/name/email, so anything richer (shipping addresses, channel prefs,
 * payout details) lives here.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findById, query } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

interface ShippingAddress {
  id: string
  label: string
  street: string
  city: string
  state: string
  postal: string
  country?: string
  primary?: boolean
}

interface NotificationPrefs {
  order_email?: boolean
  order_push?: boolean
  marketing_email?: boolean
  marketing_push?: boolean
  vendor_email?: boolean
  vendor_push?: boolean
}

interface PayoutAccount {
  account?: string
  taxId?: string
  currency?: string
}

interface MarketplacePrefs {
  firstName?: string
  lastName?: string
  username?: string
  avatarUrl?: string
  addresses?: ShippingAddress[]
  notificationPrefs?: NotificationPrefs
  payoutAccount?: PayoutAccount
}

interface OAuthData {
  mvm?: MarketplacePrefs
  [k: string]: unknown
}

router.get('/me', async (_req: Request, res: Response, next) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const user = await findById<Record<string, unknown>>('users', userId)
    if (!user) {
      return res
        .status(404)
        .json({ error: t('users.notFound', {}, { defaultValue: 'User not found' }) })
    }
    const oauthData = (user.oauthData ?? {}) as OAuthData
    const prefs = oauthData.mvm ?? {}
    res.json({
      id: userId,
      name: user.name ?? null,
      email: user.email ?? null,
      username: user.username ?? null,
      planKey: user.planKey ?? 'free',
      prefs,
    })
  } catch (error) {
    return next(error)
  }
})

const addressSchema = z.object({
  id: z.string().min(1).optional(),
  label: z.string().max(80).optional().default('Address'),
  street: z.string().max(200),
  city: z.string().max(120),
  state: z.string().max(120).optional().default(''),
  postal: z.string().max(40),
  country: z.string().max(80).optional(),
  primary: z.boolean().optional(),
})

const updateSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    username: z.string().max(40).optional(),
    prefs: z
      .object({
        firstName: z.string().max(120).optional(),
        lastName: z.string().max(120).optional(),
        username: z.string().max(40).optional(),
        avatarUrl: z.string().max(500).optional(),
        addresses: z.array(addressSchema).max(10).optional(),
        notificationPrefs: z.record(z.string().min(1).max(40), z.boolean()).optional(),
        payoutAccount: z
          .object({
            account: z.string().max(200).optional(),
            taxId: z.string().max(120).optional(),
            currency: z.string().max(8).optional(),
          })
          .optional(),
      })
      .optional(),
  })
  .refine((v) => v.name !== undefined || v.username !== undefined || v.prefs !== undefined, {
    message: 'Provide at least one of name, username, or prefs',
  })

router.patch('/me', validateBody(updateSchema), async (req: Request, res: Response, next) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const body = req.body as z.infer<typeof updateSchema>

    // Merge prefs into oauthData.mvm in a single statement so concurrent
    // patches don't clobber each other's keys.
    if (body.prefs !== undefined) {
      await query(
        `UPDATE users
         SET "oauthData" = jsonb_set(
               COALESCE("oauthData", '{}'::jsonb),
               '{mvm}',
               COALESCE("oauthData"->'mvm', '{}'::jsonb) || $2::jsonb,
               true
             ),
             "updatedAt" = now()
         WHERE id = $1::uuid`,
        [userId, JSON.stringify(body.prefs)],
      )
    }
    if (body.name !== undefined) {
      await query(`UPDATE users SET name = $2, "updatedAt" = now() WHERE id = $1::uuid`, [
        userId,
        body.name,
      ])
    }
    if (body.username !== undefined) {
      const cleaned = body.username.replace(/[^a-zA-Z0-9]/g, '').substring(0, 40)
      if (cleaned.length === 0) {
        return res.status(400).json({
          error: t(
            'user.error.usernameCannotBeEmpty',
            {},
            { defaultValue: 'Username cannot be empty' },
          ),
        })
      }
      // Reject conflicts so the UI can surface them instead of silently ignoring.
      const conflict = await query<{ id: string }>(
        `SELECT id FROM users WHERE username = $1 AND id <> $2::uuid LIMIT 1`,
        [cleaned, userId],
      )
      if (conflict.rows.length > 0) {
        return res.status(409).json({
          error: t('user.error.usernameUnavailable', {}, { defaultValue: 'Username unavailable' }),
        })
      }
      await query(`UPDATE users SET username = $2, "updatedAt" = now() WHERE id = $1::uuid`, [
        userId,
        cleaned,
      ])
    }

    const user = await findById<Record<string, unknown>>('users', userId)
    const oauthData = (user?.oauthData ?? {}) as OAuthData
    res.json({
      id: userId,
      name: user?.name ?? null,
      email: user?.email ?? null,
      username: user?.username ?? null,
      planKey: user?.planKey ?? 'free',
      prefs: oauthData.mvm ?? {},
    })
  } catch (error) {
    return next(error)
  }
})

export default router
