import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'

import type { StatusPageLimits } from '../tiers.js'
import { writeAuditLog } from './_audit.js'

const router = Router()

const VALID_CHANNELS = ['email', 'sms', 'webhook'] as const
const VALID_NOTIFICATION_TYPES = ['all', 'incidents', 'maintenance'] as const

const createSubscriberSchema = z.object({
  email: z.string().email().optional(),
  destination: z.string().min(1).max(500).optional(),
  channel: z.enum(VALID_CHANNELS).optional().default('email'),
  notification_type: z.enum(VALID_NOTIFICATION_TYPES).optional().default('all'),
  components: z.array(z.string()).optional().default([]),
})

const updateSubscriberSchema = z.object({
  notification_type: z.enum(VALID_NOTIFICATION_TYPES).optional(),
  components: z.array(z.string()).optional(),
  is_confirmed: z.boolean().optional(),
})

router.get('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  }
  const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
  const subscribers = await findMany('status_subscribers', {
    where,
    orderBy: [{ field: 'created_at', direction: 'desc' }],
  })
  res.json(subscribers)
})

// Enforce the per-tier subscriber cap (tiers.ts maxSubscribers) — defined + advertised but never enforced.
const enforceSubscriberLimit = enforceLimit<StatusPageLimits>({
  limitType: 'maxSubscribers',
  getLimit: (limits) => limits.maxSubscribers,
  getCurrent: async (userId) =>
    count('status_subscribers', [{ field: 'user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post('/', enforceSubscriberLimit, async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  }
  const parsed = createSubscriberSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
  }
  const destination = parsed.data.destination ?? parsed.data.email
  if (!destination) {
    return res.status(400).json({
      error: t(
        'subscribers.missingDestination',
        {},
        { defaultValue: 'Subscriber destination required' },
      ),
    })
  }
  const result = await create<Record<string, unknown>>('status_subscribers', {
    user_id: userId,
    channel: parsed.data.channel,
    destination,
    email: parsed.data.email ?? (parsed.data.channel === 'email' ? destination : null),
    notification_type: parsed.data.notification_type,
    components: JSON.stringify(parsed.data.components),
    is_confirmed: false,
  })
  const created = (result.data ?? result) as { id: string }
  await writeAuditLog({
    userId,
    actorUserId: userId,
    action: 'subscriber.create',
    scope: 'subscribers',
    target: created.id,
    summary: `${parsed.data.channel}:${destination}`,
    payload: { notification_type: parsed.data.notification_type },
  })
  res.status(201).json(result.data ?? result)
})

router.patch('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  }
  const id = getParamId(req)
  const existing = await findById<Record<string, unknown>>('status_subscribers', id)
  if (!existing || existing.user_id !== userId) {
    return res
      .status(404)
      .json({ error: t('subscribers.notFound', {}, { defaultValue: 'Subscriber not found' }) })
  }
  const parsed = updateSubscriberSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
  }
  const updates: Record<string, unknown> = {}
  if (parsed.data.notification_type !== undefined)
    updates.notification_type = parsed.data.notification_type
  if (parsed.data.components !== undefined)
    updates.components = JSON.stringify(parsed.data.components)
  if (parsed.data.is_confirmed !== undefined) updates.is_confirmed = parsed.data.is_confirmed
  if (Object.keys(updates).length === 0) {
    return res.json(existing)
  }
  const result = await updateById('status_subscribers', id, updates)
  await writeAuditLog({
    userId,
    actorUserId: userId,
    action: 'subscriber.update',
    scope: 'subscribers',
    target: id,
    summary: existing.destination as string | undefined,
    payload: updates,
  })
  res.json(result.data ?? result)
})

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  }
  const id = getParamId(req)
  const subscriber = await findById<Record<string, unknown>>('status_subscribers', id)
  if (!subscriber || subscriber.user_id !== userId) {
    return res
      .status(404)
      .json({ error: t('subscribers.notFound', {}, { defaultValue: 'Subscriber not found' }) })
  }
  await deleteById('status_subscribers', id)
  await writeAuditLog({
    userId,
    actorUserId: userId,
    action: 'subscriber.delete',
    scope: 'subscribers',
    target: id,
    summary: subscriber.destination as string | undefined,
  })
  res.status(204).end()
})

export default router
