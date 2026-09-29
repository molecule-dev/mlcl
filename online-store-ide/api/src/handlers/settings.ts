/**
 * Server-side personal-settings channel.
 *
 * The platform user resource NEVER returns `oauthData` on reads (GET
 * /api/users/me strips it), so a client that persists profile slices
 * (phone / location / notification toggles) into that column could
 * write them but never read them back on a fresh session — the page
 * fell back to defaults while the data sat in the DB. This handler is
 * the read/merge channel for that slice: it reads the signed-in user's
 * row, merges the `settings` slice of the oauthData JSON column
 * server-side, and returns it. PATCH merges partial updates so two
 * clients never clobber unrelated keys.
 */
import type { Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const DEFAULT_SETTINGS = {
  phone: '',
  location: '',
  notifications: {
    orderUpdates: true,
    promotions: true,
    priceDrops: false,
    newsletter: false,
  },
}

const notificationsSchema = z
  .object({
    orderUpdates: z.boolean().optional(),
    promotions: z.boolean().optional(),
    priceDrops: z.boolean().optional(),
    newsletter: z.boolean().optional(),
  })
  .optional()

const patchSchema = z.object({
  phone: z.string().max(40).optional(),
  location: z.string().max(200).optional(),
  notifications: notificationsSchema,
})

interface UserOauthData {
  settings?: Partial<typeof DEFAULT_SETTINGS>
  [key: string]: unknown
}

interface AppSettings {
  phone: string
  location: string
  notifications: {
    orderUpdates: boolean
    promotions: boolean
    priceDrops: boolean
    newsletter: boolean
  }
}

const requireSession = (res: Response): string | null => {
  const userId = res.locals.session?.userId as string | undefined
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' })
    return null
  }
  return userId
}

const readOauthData = (user: Record<string, unknown> | null): UserOauthData => {
  const raw = user?.oauthData ?? user?.oauth_data
  if (raw && typeof raw === 'object') return raw as UserOauthData
  if (typeof raw === 'string' && raw.length > 0) {
    try {
      const parsed = JSON.parse(raw) as unknown
      if (parsed && typeof parsed === 'object') return parsed as UserOauthData
    } catch (_error) {
      // Malformed JSON in oauthData — intentional noop, fall through to empty default
    }
  }
  return {}
}

const mergedSettings = (oauthData: UserOauthData): AppSettings => ({
  ...DEFAULT_SETTINGS,
  ...(oauthData.settings ?? {}),
  notifications: {
    ...DEFAULT_SETTINGS.notifications,
    ...(oauthData.settings?.notifications ?? {}),
  },
})

/** GET /api/settings — the signed-in user's personal settings slice. */
router.get('/', async (_req, res) => {
  try {
    const userId = requireSession(res)
    if (!userId) return
    const user = await findById<Record<string, unknown>>('users', userId)
    res.json(mergedSettings(readOauthData(user)))
  } catch (error) {
    logger.error('settings.read', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

/**
 * PATCH /api/settings — merge a partial payload into the signed-in
 * user's oauthData.settings JSON slice and return the merged result so
 * the client can rehydrate from the response.
 */
router.patch('/', validateBody(patchSchema), async (req, res) => {
  try {
    const userId = requireSession(res)
    if (!userId) return
    const body = (req.body ?? {}) as Partial<typeof DEFAULT_SETTINGS>
    const user = await findById<Record<string, unknown>>('users', userId)
    const oauthData = readOauthData(user)
    const current = mergedSettings(oauthData)
    const merged = {
      ...current,
      ...body,
      notifications: { ...current.notifications, ...(body.notifications ?? {}) },
    }
    const nextOauthData = { ...oauthData, settings: merged }
    await updateById('users', userId, { oauthData: JSON.stringify(nextOauthData) })
    res.json(merged)
  } catch (error) {
    logger.error('settings.update', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
