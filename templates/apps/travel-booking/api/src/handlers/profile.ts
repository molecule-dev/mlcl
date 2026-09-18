/**
 * Profile handler — read + patch the authenticated user's app-specific
 * profile fields.
 *
 * Stores per-app preferences inside `users.oauthData.tb` so the core
 * users table doesn't need new columns. Returns the projection the
 * Account page expects, including loyalty miles + saved payment methods.
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

interface UserRow {
  id: string
  email: string | null
  name: string | null
  oauthData: Record<string, unknown> | null
  createdAt: string
}

interface TbProfile {
  firstName?: string
  lastName?: string
  phone?: string
  loyaltyTier?: 'Drifter' | 'Wanderer' | 'Voyager'
  loyaltyPoints?: number
  preferences?: {
    pushEnabled?: boolean
    emailEnabled?: boolean
    priceDropAlerts?: boolean
  }
  paymentMethods?: Array<{
    id: string
    brand: 'visa' | 'mastercard' | 'amex' | 'discover'
    last4: string
    isDefault: boolean
  }>
}

const TIER_THRESHOLDS = [
  { tier: 'Drifter', next: 'Wanderer', nextPoints: 7500 },
  { tier: 'Wanderer', next: 'Voyager', nextPoints: 25000 },
  { tier: 'Voyager', next: 'Voyager', nextPoints: 25000 },
] as const

const DEFAULT_TIER_BENEFITS: Record<string, string[]> = {
  Drifter: [
    'Free cancellation on every itinerary',
    '5% off curated rates',
    'Late checkout when available',
  ],
  Wanderer: [
    'Free cancellation on every itinerary',
    '12% off curated rates + member-only stays',
    'Priority customer support',
    'Welcome amenity at boutique stays',
  ],
  Voyager: [
    'Concierge-managed itineraries',
    '20% off curated rates + private rates',
    'Free upgrades when available',
    'Dedicated 24/7 trip support',
  ],
}

const DEFAULT_PAYMENTS: TbProfile['paymentMethods'] = [
  { id: 'pm_default_visa', brand: 'visa', last4: '4242', isDefault: true },
]

const updateProfileSchema = z.object({
  firstName: z.string().max(120).optional(),
  lastName: z.string().max(120).optional(),
  phone: z.string().max(40).optional(),
  preferences: z
    .object({
      pushEnabled: z.boolean().optional(),
      emailEnabled: z.boolean().optional(),
      priceDropAlerts: z.boolean().optional(),
    })
    .partial()
    .optional(),
})

const addPaymentSchema = z.object({
  brand: z.enum(['visa', 'mastercard', 'amex', 'discover']).default('visa'),
  last4: z.string().regex(/^\d{4}$/),
  setDefault: z.boolean().optional(),
})

const idParamSchema = z.object({ paymentId: z.string().min(1) })

function projectProfile(user: UserRow): Record<string, unknown> {
  const oauthData = (user.oauthData ?? {}) as Record<string, unknown>
  const tb = (oauthData.tb ?? {}) as TbProfile
  const points = tb.loyaltyPoints ?? Math.min(7400, 1280 + (Math.abs(hashCode(user.id)) % 6000))
  const tier =
    tb.loyaltyTier ?? (points >= 25000 ? 'Voyager' : points >= 7500 ? 'Wanderer' : 'Drifter')
  const tierMeta = TIER_THRESHOLDS.find((t) => t.tier === tier) ?? TIER_THRESHOLDS[0]
  const [first, ...rest] = (user.name ?? '').trim().split(/\s+/)
  const payments =
    tb.paymentMethods && tb.paymentMethods.length > 0 ? tb.paymentMethods : DEFAULT_PAYMENTS
  return {
    id: user.id,
    email: user.email,
    firstName: tb.firstName ?? first ?? '',
    lastName: tb.lastName ?? rest.join(' ') ?? '',
    phone: tb.phone ?? '',
    loyalty: {
      tier,
      points,
      next_tier: tierMeta.next,
      next_tier_points: tierMeta.nextPoints,
      benefits: DEFAULT_TIER_BENEFITS[tier] ?? DEFAULT_TIER_BENEFITS.Drifter,
    },
    preferences: {
      pushEnabled: tb.preferences?.pushEnabled ?? true,
      emailEnabled: tb.preferences?.emailEnabled ?? true,
      priceDropAlerts: tb.preferences?.priceDropAlerts ?? true,
    },
    paymentMethods: payments,
  }
}

function hashCode(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return h
}

router.get('/me', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const user = (await findById('users', userId)) as UserRow | null
  if (!user) {
    res.status(404).json({ error: t('user.notFound', {}, { defaultValue: 'User not found' }) })
    return
  }
  res.json(projectProfile(user))
})

router.patch('/me', validateBody(updateProfileSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const user = (await findById('users', userId)) as UserRow | null
  if (!user) {
    res.status(404).json({ error: t('user.notFound', {}, { defaultValue: 'User not found' }) })
    return
  }
  const body = req.body as z.infer<typeof updateProfileSchema>
  const oauthData = (user.oauthData ?? {}) as Record<string, unknown>
  const tb = (oauthData.tb ?? {}) as TbProfile
  const next: TbProfile = {
    ...tb,
    firstName: body.firstName ?? tb.firstName,
    lastName: body.lastName ?? tb.lastName,
    phone: body.phone ?? tb.phone,
    preferences: { ...(tb.preferences ?? {}), ...(body.preferences ?? {}) },
  }
  await updateById('users', userId, { oauthData: { ...oauthData, tb: next } })
  const fresh = (await findById('users', userId)) as UserRow
  res.json(projectProfile(fresh))
})

router.post(
  '/payment-methods',
  validateBody(addPaymentSchema),
  async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const user = (await findById('users', userId)) as UserRow | null
    if (!user) {
      res.status(404).json({ error: t('user.notFound', {}, { defaultValue: 'User not found' }) })
      return
    }
    const body = req.body as z.infer<typeof addPaymentSchema>
    const oauthData = (user.oauthData ?? {}) as Record<string, unknown>
    const tb = (oauthData.tb ?? {}) as TbProfile
    const existing = tb.paymentMethods ?? DEFAULT_PAYMENTS!
    const newId = `pm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
    const setDefault = body.setDefault ?? existing.length === 0
    const updated = existing.map((p) => ({ ...p, isDefault: setDefault ? false : p.isDefault }))
    updated.push({ id: newId, brand: body.brand, last4: body.last4, isDefault: setDefault })
    await updateById('users', userId, {
      oauthData: { ...oauthData, tb: { ...tb, paymentMethods: updated } },
    })
    const fresh = (await findById('users', userId)) as UserRow
    res.status(201).json({ data: projectProfile(fresh) })
  },
)

router.delete('/payment-methods/:paymentId', async (req: Request, res: Response) => {
  const parse = idParamSchema.safeParse(req.params)
  if (!parse.success) {
    res.status(400).json({ error: 'invalid id' })
    return
  }
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const user = (await findById('users', userId)) as UserRow | null
  if (!user) {
    res.status(404).json({ error: t('user.notFound', {}, { defaultValue: 'User not found' }) })
    return
  }
  const oauthData = (user.oauthData ?? {}) as Record<string, unknown>
  const tb = (oauthData.tb ?? {}) as TbProfile
  const existing = tb.paymentMethods ?? DEFAULT_PAYMENTS!
  const filtered = existing.filter((p) => p.id !== parse.data.paymentId)
  // If we removed the default, promote the first remaining payment.
  if (filtered.length > 0 && !filtered.some((p) => p.isDefault)) {
    filtered[0] = { ...filtered[0], isDefault: true }
  }
  await updateById('users', userId, {
    oauthData: { ...oauthData, tb: { ...tb, paymentMethods: filtered } },
  })
  const fresh = (await findById('users', userId)) as UserRow
  res.json({ data: projectProfile(fresh) })
})

export default router
