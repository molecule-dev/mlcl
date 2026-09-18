/**
 * Current-user endpoint — small read/update helpers keyed off the session
 * cookie so the frontend Settings page does not need to know its own user id.
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

const NOTIFY_KEYS = ['outbid', 'ending', 'won', 'new_bid', 'sold', 'watchlist', 'system'] as const

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  username: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  notifyPrefs: z.record(z.string(), z.boolean()).optional(),
})

interface AppOauthData {
  ap?: {
    notifyPrefs?: Record<string, boolean>
  }
  [key: string]: unknown
}

function readOauthData(user: Record<string, unknown> | null): AppOauthData {
  const raw = user?.oauthData
  if (!raw) return {}
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as AppOauthData
    } catch (_error) {
      // safe to ignore: malformed JSON falls back to empty oauth data
      return {}
    }
  }
  if (typeof raw === 'object') return raw as AppOauthData
  return {}
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = (res.locals.session as { userId?: string } | undefined)?.userId ?? null
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const user = await findById<Record<string, unknown>>('users', userId)
    if (!user) {
      res.status(404).json({ error: t('me.notFound', {}, { defaultValue: 'User not found' }) })
      return
    }
    const data = readOauthData(user)
    const notifyPrefs =
      data.ap?.notifyPrefs ?? Object.fromEntries(NOTIFY_KEYS.map((k) => [k, true]))
    res.json({
      id: user.id,
      name: user.name ?? null,
      username: user.username ?? null,
      email: user.email ?? null,
      planKey: user.planKey ?? null,
      notifyPrefs,
    })
  } catch (error) {
    logger.error('me.get', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.patch('/', validateBody(updateSchema), async (req: Request, res: Response) => {
  try {
    const userId = (res.locals.session as { userId?: string } | undefined)?.userId ?? null
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const body = req.body as z.infer<typeof updateSchema>
    const updates: Record<string, unknown> = {}
    if (body.name !== undefined) updates.name = body.name
    if (body.username !== undefined) updates.username = body.username
    if (body.email !== undefined) updates.email = body.email
    if (body.notifyPrefs !== undefined) {
      const user = await findById<Record<string, unknown>>('users', userId)
      const data = readOauthData(user)
      const ap = { ...(data.ap ?? {}), notifyPrefs: { ...body.notifyPrefs } }
      updates.oauthData = JSON.stringify({ ...data, ap })
    }
    if (Object.keys(updates).length === 0) {
      res.json({ ok: true })
      return
    }
    const result = await updateById('users', userId, updates)
    const updated = result.data as Record<string, unknown>
    const data = readOauthData(updated)
    res.json({
      id: updated.id,
      name: updated.name ?? null,
      username: updated.username ?? null,
      email: updated.email ?? null,
      planKey: updated.planKey ?? null,
      notifyPrefs: data.ap?.notifyPrefs ?? Object.fromEntries(NOTIFY_KEYS.map((k) => [k, true])),
    })
  } catch (error) {
    logger.error('me.patch', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
