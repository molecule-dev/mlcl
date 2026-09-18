/**
 * webhook-manager — profile (user prefs + sessions + danger-zone delete).
 *
 * Sessions come from the `devices` table (camelCase columns from
 * `@molecule/api-resource-device`: id, userId, createdAt, updatedAt,
 * name, pushPlatform, pushSubscription, hasPushSubscription).
 *
 * Identity / preference fields:
 *   `users.name`        — display name shown in UI
 *   `users.username`    — short handle / login alias
 *   `users.preferences` — JSONB for UI prefs (added by 0011 migration)
 *
 * Account delete is a hard delete that cascades through user-owned tables.
 * `audit_events` rows are preserved but anonymised.
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import {
  deleteById,
  deleteMany,
  findById,
  findMany,
  updateById,
  updateMany,
} from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import { recordAudit } from './_audit.js'

const router = Router()

const sanitizeUser = (user: Record<string, unknown> | null): Record<string, unknown> | null => {
  if (!user) return null
  const safe = { ...user } as Record<string, unknown>
  delete safe.hashed_password
  delete safe.password
  delete safe.totp_secret
  delete safe.passwordHash
  delete safe.passwordResetToken
  delete safe.twoFactorSecret
  delete safe.pendingTwoFactorSecret
  return safe
}

router.get('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    return
  }
  const user = await findById<Record<string, unknown>>('users', userId)
  if (!user) {
    res.status(404).json({ error: t('profile.notFound', {}, { defaultValue: 'User not found' }) })
    return
  }
  res.json(sanitizeUser(user))
})

const updateProfileSchema = z.object({
  name: z.string().max(120).optional(),
  username: z.string().max(120).optional(),
  preferences: z.record(z.string(), z.unknown()).optional(),
})

router.patch('/', validateBody(updateProfileSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    return
  }
  const body = req.body as z.infer<typeof updateProfileSchema>
  const updates: Record<string, unknown> = { updatedAt: new Date() }
  if (body.name !== undefined) updates.name = body.name
  if (body.username !== undefined) updates.username = body.username
  if (body.preferences !== undefined) updates.preferences = JSON.stringify(body.preferences)
  const result = await updateById('users', userId, updates)
  await recordAudit({
    userId,
    action: 'profile.updated',
    target: userId,
    metadata: { changedFields: Object.keys(updates).filter((k) => k !== 'updatedAt') },
    req,
  })
  res.json(sanitizeUser(result.data as Record<string, unknown> | null))
})

router.get('/sessions', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    return
  }
  const sessions = await findMany('devices', {
    where: [{ field: 'userId', operator: '=', value: userId }],
    orderBy: [{ field: 'updatedAt', direction: 'desc' }],
  })
  res.json(sessions)
})

router.delete('/sessions/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    return
  }
  const id = getParamId(req)
  const session = await findById<Record<string, unknown>>('devices', id)
  if (!session || session.userId !== userId) {
    res
      .status(404)
      .json({ error: t('profile.session.notFound', {}, { defaultValue: 'Session not found' }) })
    return
  }
  await deleteById('devices', id)
  await recordAudit({
    userId,
    action: 'session.revoked',
    target: id,
    metadata: { name: session.name ?? null },
    req,
  })
  res.json({ revoked: true })
})

router.delete('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    return
  }
  await updateMany('audit_events', [{ field: 'user_id', operator: '=', value: userId }], {
    user_id: null,
    actor: 'deleted-user',
  })
  await deleteMany('api_keys', [{ field: 'user_id', operator: '=', value: userId }])
  await deleteMany('notifications', [{ field: 'user_id', operator: '=', value: userId }])
  await deleteMany('webhooks', [{ field: 'user_id', operator: '=', value: userId }])
  await deleteMany('team_members', [{ field: 'user_id', operator: '=', value: userId }])
  await deleteMany('devices', [{ field: 'userId', operator: '=', value: userId }])
  await deleteById('usersSecrets', userId)
  await deleteById('users', userId)
  res.json({ deleted: true })
})

export default router
