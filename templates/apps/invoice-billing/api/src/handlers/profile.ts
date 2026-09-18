/**
 * Profile / preferences handler.
 *
 * Wraps the molecule user resource with a thin per-app surface:
 *
 *   GET  /api/profile/me        — fully merged profile (user row + oauthData
 *                                 settings: business, branding, notifications)
 *   PATCH /api/profile/me       — partial update of the same shape, persisted
 *                                 into either the users row (name/email) or
 *                                 the JSONB oauthData blob (everything else)
 *
 * This keeps "Save changes" on the Settings page a real, persistence-backed
 * action — read-after-write is the contract.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const router = Router()

interface OAuthDataShape {
  business?: {
    name?: string
    address?: string
    taxId?: string
    billingEmail?: string
    phone?: string
  }
  branding?: {
    primaryColor?: string
    accentColor?: string
    tagline?: string
    logoText?: string
  }
  preferences?: {
    timezone?: string
    currency?: string
    invoicePrefix?: string
    defaultDueDays?: number
  }
  notifications?: {
    emailOnPayment?: boolean
    emailOnView?: boolean
    emailOnOverdue?: boolean
    weeklyDigest?: boolean
  }
  paymentMethods?: {
    stripe?: boolean
    bank?: boolean
    paypal?: boolean
    manual?: boolean
  }
  [key: string]: unknown
}

interface UserRow {
  id: string
  username?: string | null
  name?: string | null
  email?: string | null
  oauthData?: OAuthDataShape | null
  planKey?: string | null
}

interface ProfileBusiness {
  name: string
  address: string
  taxId: string
  billingEmail: string
  phone: string
}
interface ProfileBranding {
  primaryColor: string
  accentColor: string
  tagline: string
  logoText: string
}
interface ProfilePreferences {
  timezone: string
  currency: string
  invoicePrefix: string
  defaultDueDays: number
}
interface ProfileNotifications {
  emailOnPayment: boolean
  emailOnView: boolean
  emailOnOverdue: boolean
  weeklyDigest: boolean
}
interface ProfilePaymentMethods {
  stripe: boolean
  bank: boolean
  paypal: boolean
  manual: boolean
}

const profileShape: {
  business: ProfileBusiness
  branding: ProfileBranding
  preferences: ProfilePreferences
  notifications: ProfileNotifications
  paymentMethods: ProfilePaymentMethods
} = {
  business: {
    name: '',
    address: '',
    taxId: '',
    billingEmail: '',
    phone: '',
  },
  branding: {
    primaryColor: '#0a5c5f',
    accentColor: '#e86c3a',
    tagline: '',
    logoText: '',
  },
  preferences: {
    timezone: 'America/New_York',
    currency: 'USD',
    invoicePrefix: 'INV-',
    defaultDueDays: 14,
  },
  notifications: {
    emailOnPayment: true,
    emailOnView: true,
    emailOnOverdue: true,
    weeklyDigest: false,
  },
  paymentMethods: {
    stripe: true,
    bank: true,
    paypal: false,
    manual: true,
  },
}

function mergeProfile(user: UserRow): {
  id: string
  username: string
  name: string
  email: string
  planKey: string
  business: ProfileBusiness
  branding: ProfileBranding
  preferences: ProfilePreferences
  notifications: ProfileNotifications
  paymentMethods: ProfilePaymentMethods
} {
  const oauthData = (user.oauthData ?? {}) as OAuthDataShape
  return {
    id: user.id,
    username: user.username ?? '',
    name: user.name ?? '',
    email: user.email ?? '',
    planKey: user.planKey ?? 'free',
    business: { ...profileShape.business, ...(oauthData.business ?? {}) },
    branding: { ...profileShape.branding, ...(oauthData.branding ?? {}) },
    preferences: { ...profileShape.preferences, ...(oauthData.preferences ?? {}) },
    notifications: { ...profileShape.notifications, ...(oauthData.notifications ?? {}) },
    paymentMethods: { ...profileShape.paymentMethods, ...(oauthData.paymentMethods ?? {}) },
  }
}

router.get('/me', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const user = await findById<UserRow>('users', userId)
    if (!user) return res.status(404).json({ error: t('profile.notFound') })

    res.json(mergeProfile(user))
  } catch (error) {
    logger.error('profile.get', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

const businessSchema = z
  .object({
    name: z.string().max(255).optional(),
    address: z.string().max(2048).optional(),
    taxId: z.string().max(64).optional(),
    billingEmail: z.string().email().optional().or(z.literal('')),
    phone: z.string().max(64).optional(),
  })
  .strict()
  .partial()

const brandingSchema = z
  .object({
    primaryColor: z.string().max(32).optional(),
    accentColor: z.string().max(32).optional(),
    tagline: z.string().max(255).optional(),
    logoText: z.string().max(64).optional(),
  })
  .strict()
  .partial()

const preferencesSchema = z
  .object({
    timezone: z.string().max(64).optional(),
    currency: z.string().min(3).max(8).optional(),
    invoicePrefix: z.string().max(16).optional(),
    defaultDueDays: z.number().int().min(0).max(365).optional(),
  })
  .strict()
  .partial()

const notificationsSchema = z
  .object({
    emailOnPayment: z.boolean().optional(),
    emailOnView: z.boolean().optional(),
    emailOnOverdue: z.boolean().optional(),
    weeklyDigest: z.boolean().optional(),
  })
  .strict()
  .partial()

const paymentMethodsSchema = z
  .object({
    stripe: z.boolean().optional(),
    bank: z.boolean().optional(),
    paypal: z.boolean().optional(),
    manual: z.boolean().optional(),
  })
  .strict()
  .partial()

const patchSchema = z.object({
  name: z.string().max(255).optional(),
  email: z.string().email().optional(),
  business: businessSchema.optional(),
  branding: brandingSchema.optional(),
  preferences: preferencesSchema.optional(),
  notifications: notificationsSchema.optional(),
  paymentMethods: paymentMethodsSchema.optional(),
})

router.patch('/me', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const parsed = patchSchema.safeParse(req.body ?? {})
    if (!parsed.success) {
      return res.status(400).json({
        error: t('profile.error.invalidPayload', undefined, {
          defaultValue: 'Invalid profile payload',
        }),
        details: parsed.error.issues,
      })
    }

    const existing = await findById<UserRow>('users', userId)
    if (!existing) return res.status(404).json({ error: t('profile.notFound') })

    const updates: Record<string, unknown> = {}
    if (parsed.data.name !== undefined) updates.name = parsed.data.name
    if (parsed.data.email !== undefined) updates.email = parsed.data.email

    const oldOauth = (existing.oauthData ?? {}) as OAuthDataShape
    const oauthDataNext: OAuthDataShape = { ...oldOauth }

    if (parsed.data.business) {
      oauthDataNext.business = { ...(oldOauth.business ?? {}), ...parsed.data.business }
    }
    if (parsed.data.branding) {
      oauthDataNext.branding = { ...(oldOauth.branding ?? {}), ...parsed.data.branding }
    }
    if (parsed.data.preferences) {
      oauthDataNext.preferences = { ...(oldOauth.preferences ?? {}), ...parsed.data.preferences }
    }
    if (parsed.data.notifications) {
      oauthDataNext.notifications = {
        ...(oldOauth.notifications ?? {}),
        ...parsed.data.notifications,
      }
    }
    if (parsed.data.paymentMethods) {
      oauthDataNext.paymentMethods = {
        ...(oldOauth.paymentMethods ?? {}),
        ...parsed.data.paymentMethods,
      }
    }

    const oauthChanged =
      parsed.data.business ||
      parsed.data.branding ||
      parsed.data.preferences ||
      parsed.data.notifications ||
      parsed.data.paymentMethods
    if (oauthChanged) {
      updates.oauthData = oauthDataNext
    }

    if (Object.keys(updates).length > 0) {
      updates.updatedAt = new Date()
      await updateById('users', userId, updates)
    }

    const updated = await findById<UserRow>('users', userId)
    if (!updated) return res.status(500).json({ error: t('errors.internalServer') })
    res.json(mergeProfile(updated))
  } catch (error) {
    logger.error('profile.patch', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

export default router
