/**
 * Alert rules handler — user-owned alerting rules that fire on issue/event
 * activity. Validation via zod + `@molecule/api-middleware-validation`,
 * authorization scopes by `user_id` to prevent IDOR.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

import { seedDemoForUser } from './_seed.js'

const router = Router()

const listQuerySchema = z.object({
  project_id: z.string().optional(),
  status: z.enum(['active', 'paused']).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
})

const createAlertSchema = z.object({
  project_id: z.string().min(1),
  name: z.string().min(1),
  rule_type: z.string().optional(),
  level: z.string().optional(),
  threshold: z.number().int().min(1).optional(),
  window_seconds: z.number().int().min(1).optional(),
  fingerprint_filter: z.string().optional(),
  scope: z.string().optional(),
  environment: z.string().optional(),
  channels: z.array(z.unknown()).optional(),
  owners: z.array(z.unknown()).optional(),
  status: z.enum(['active', 'paused']).optional(),
  is_enabled: z.boolean().optional(),
  notification_channel: z.string().optional(),
  notification_target: z.string().optional(),
  condition_type: z.string().optional(),
  condition_value: z.string().optional(),
})

const updateAlertSchema = createAlertSchema.partial()

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

  await seedDemoForUser(userId)
  const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
  if (req.query.project_id) {
    where.push({ field: 'project_id', operator: '=', value: String(req.query.project_id) })
  }
  if (req.query.status) {
    where.push({ field: 'status', operator: '=', value: String(req.query.status) })
  }
  const limit = req.query.limit ? Number(req.query.limit) : 100
  const alerts = await findMany('alert_rules', {
    where,
    orderBy: [{ field: 'created_at', direction: 'desc' }],
    limit,
  })
  res.json(alerts)
})

router.get('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

  const id = getParamId(req)
  const alert = await findById<Record<string, unknown>>('alert_rules', id)
  if (!alert || alert.user_id !== userId) {
    return res.status(404).json({ error: t('alerts.notFound') })
  }
  res.json(alert)
})

router.post('/', validateBody(createAlertSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

  const body = req.body as z.infer<typeof createAlertSchema>
  const result = await create('alert_rules', {
    user_id: userId,
    project_id: body.project_id,
    name: body.name,
    rule_type: body.rule_type ?? 'issue-frequency',
    level: body.level ?? null,
    threshold: body.threshold ?? 1,
    window_seconds: body.window_seconds ?? 60,
    fingerprint_filter: body.fingerprint_filter ?? null,
    scope: body.scope ?? 'project',
    environment: body.environment ?? null,
    channels: JSON.stringify(body.channels ?? []),
    owners: JSON.stringify(body.owners ?? []),
    status: body.status ?? 'active',
    is_enabled: body.is_enabled ?? true,
    notification_channel: body.notification_channel ?? 'email',
    notification_target: body.notification_target ?? null,
    condition_type: body.condition_type ?? null,
    condition_value: body.condition_value ?? null,
    created_at: new Date(),
    updated_at: new Date(),
  })
  res.status(201).json(result.data)
})

router.put('/:id', validateBody(updateAlertSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

  const id = getParamId(req)
  const existing = await findById<Record<string, unknown>>('alert_rules', id)
  if (!existing || existing.user_id !== userId) {
    return res.status(404).json({ error: t('alerts.notFound') })
  }

  const body = req.body as z.infer<typeof updateAlertSchema>
  const updates: Record<string, unknown> = { updated_at: new Date() }
  for (const k of [
    'name',
    'rule_type',
    'level',
    'threshold',
    'window_seconds',
    'fingerprint_filter',
    'scope',
    'environment',
    'status',
    'is_enabled',
    'notification_channel',
    'notification_target',
    'condition_type',
    'condition_value',
  ] as const) {
    if (body[k] !== undefined) updates[k] = body[k]
  }
  if (body.channels !== undefined) updates.channels = JSON.stringify(body.channels)
  if (body.owners !== undefined) updates.owners = JSON.stringify(body.owners)
  const result = await updateById('alert_rules', id, updates)
  res.json(result.data)
})

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

  const id = getParamId(req)
  const existing = await findById<Record<string, unknown>>('alert_rules', id)
  if (!existing || existing.user_id !== userId) {
    return res.status(404).json({ error: t('alerts.notFound') })
  }
  await deleteById('alert_rules', id)
  res.status(204).end()
})

export default router
