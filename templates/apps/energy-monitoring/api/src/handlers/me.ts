/**
 * Current-user endpoint — returns the signed-in user plus app-specific
 * preferences read out of `users.oauthData`. PATCH lets the Profile and
 * Settings pages persist household profile, monthly kWh goal, and
 * notification preferences without exposing the raw users table.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const NOTIFY_KEYS = ['push', 'email', 'quietHours'] as const

interface EnergyPrefs {
  householdSize?: number
  goalKwhPerMonth?: number
  notifyPush?: boolean
  notifyEmail?: boolean
  notifyQuietHours?: boolean
}

interface AppOauthData {
  em?: EnergyPrefs
  [key: string]: unknown
}

const DEFAULT_PREFS: Required<EnergyPrefs> = {
  householdSize: 3,
  goalKwhPerMonth: 600,
  notifyPush: true,
  notifyEmail: true,
  notifyQuietHours: true,
}

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  username: z.string().min(1).max(255).optional(),
  householdSize: z.number().int().min(1).max(50).optional(),
  goalKwhPerMonth: z.number().int().min(1).max(100_000).optional(),
  notifyPush: z.boolean().optional(),
  notifyEmail: z.boolean().optional(),
  notifyQuietHours: z.boolean().optional(),
})

function readOauthData(user: Record<string, unknown> | null): AppOauthData {
  const raw = user?.oauthData
  if (!raw) return {}
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as AppOauthData
    } catch (_error) {
      // malformed oauthData — fall back to empty prefs
      return {}
    }
  }
  if (typeof raw === 'object') return raw as AppOauthData
  return {}
}

function mergePrefs(existing: EnergyPrefs | undefined): Required<EnergyPrefs> {
  return { ...DEFAULT_PREFS, ...(existing ?? {}) }
}

function shapeUser(user: Record<string, unknown>): Record<string, unknown> {
  const data = readOauthData(user)
  const prefs = mergePrefs(data.em)
  return {
    id: user.id,
    name: (user.name as string | null) ?? null,
    username: (user.username as string | null) ?? null,
    email: (user.email as string | null) ?? null,
    planKey: (user.planKey as string | null) ?? null,
    planExpiresAt: (user.planExpiresAt as string | null) ?? null,
    planAutoRenews: (user.planAutoRenews as boolean | null) ?? false,
    householdSize: prefs.householdSize,
    goalKwhPerMonth: prefs.goalKwhPerMonth,
    notifyPush: prefs.notifyPush,
    notifyEmail: prefs.notifyEmail,
    notifyQuietHours: prefs.notifyQuietHours,
  }
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = (res.locals.session as { userId?: string } | undefined)?.userId ?? null
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const user = await findById<Record<string, unknown>>('users', userId)
    if (!user) {
      res.status(404).json({
        error: t('me.notFound', undefined, { defaultValue: 'User not found.' }),
      })
      return
    }
    res.json(shapeUser(user))
  } catch (error) {
    logger.error('me.get', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

router.patch('/', validateBody(updateSchema), async (req: Request, res: Response) => {
  try {
    const userId = (res.locals.session as { userId?: string } | undefined)?.userId ?? null
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const body = req.body as z.infer<typeof updateSchema>
    const user = await findById<Record<string, unknown>>('users', userId)
    if (!user) {
      res.status(404).json({
        error: t('me.notFound', undefined, { defaultValue: 'User not found.' }),
      })
      return
    }
    const updates: Record<string, unknown> = {}
    if (body.name !== undefined) updates.name = body.name
    if (body.username !== undefined) updates.username = body.username

    const data = readOauthData(user)
    const existingPrefs = mergePrefs(data.em)
    const newPrefs: EnergyPrefs = { ...existingPrefs }
    let prefsChanged = false
    if (body.householdSize !== undefined) {
      newPrefs.householdSize = body.householdSize
      prefsChanged = true
    }
    if (body.goalKwhPerMonth !== undefined) {
      newPrefs.goalKwhPerMonth = body.goalKwhPerMonth
      prefsChanged = true
    }
    if (body.notifyPush !== undefined) {
      newPrefs.notifyPush = body.notifyPush
      prefsChanged = true
    }
    if (body.notifyEmail !== undefined) {
      newPrefs.notifyEmail = body.notifyEmail
      prefsChanged = true
    }
    if (body.notifyQuietHours !== undefined) {
      newPrefs.notifyQuietHours = body.notifyQuietHours
      prefsChanged = true
    }
    if (prefsChanged) {
      updates.oauthData = JSON.stringify({ ...data, em: newPrefs })
    }

    if (Object.keys(updates).length === 0) {
      res.json(shapeUser(user))
      return
    }
    const result = await updateById('users', userId, updates)
    res.json(shapeUser((result as { data: Record<string, unknown> }).data))
  } catch (error) {
    logger.error('me.patch', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

void NOTIFY_KEYS

export default router
