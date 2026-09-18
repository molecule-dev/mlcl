/**
 * log-viewer — alert rules.
 *
 * GET /     — list (per-user; seeded on first call)
 * GET /:id  — detail
 * POST /    — declare a new alert rule
 * POST /:id/silence — set status='ok' for `minutes` (in v1 we just stamp
 *           last_fired_at to now and flip status; the actual silence
 *           window is enforced by the rule evaluator that doesn't ship
 *           in this template, but the state is persisted so the UI
 *           reflects it consistently across reload).
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import {
  create,
  findById,
  findMany,
  type OrderBy,
  updateById,
  type WhereCondition,
} from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import { seedDemoForUser } from './_seed.js'

const router = Router()

interface AlertRow {
  id: string
  user_id: string
  name: string
  condition: string
  severity: string
  channels: unknown
  status: string
  threshold: number
  window_seconds: number
  fire_count_24h: number
  last_fired_at: Date | string | null
  created_at: Date
  updated_at: Date
}

const VALID_SEVERITIES = ['trace', 'debug', 'info', 'warn', 'warning', 'error', 'fatal'] as const
const VALID_STATUSES = ['firing', 'monitoring', 'ok'] as const

const createAlertSchema = z.object({
  name: z.string().min(1).max(255),
  service: z.string().max(255).optional(),
  condition: z.string().max(2000).optional(),
  severity: z.enum(VALID_SEVERITIES).optional(),
  channels: z.array(z.string()).optional(),
  threshold: z.number().int().min(1).optional(),
  window_seconds: z.number().int().min(1).optional(),
})

const updateAlertSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  condition: z.string().max(2000).optional(),
  severity: z.enum(VALID_SEVERITIES).optional(),
  channels: z.array(z.string()).optional(),
  status: z.enum(VALID_STATUSES).optional(),
})

function toIso(d: Date | string | null): string | null {
  if (d === null || d === undefined) return null
  if (d instanceof Date) return d.toISOString()
  return d
}

function decorate(row: AlertRow): Record<string, unknown> {
  let channels: string[] = []
  const c = row.channels
  if (Array.isArray(c)) channels = c as string[]
  else if (typeof c === 'string') {
    try {
      const parsed = JSON.parse(c)
      if (Array.isArray(parsed)) channels = parsed
    } catch (_error) {
      // Non-JSON channel string; fall back to empty array.
      channels = []
    }
  }
  return {
    id: row.id,
    name: row.name,
    condition: row.condition,
    severity: row.severity,
    channels,
    status: row.status,
    fire_count_24h: row.fire_count_24h,
    last_fired_at: toIso(row.last_fired_at) ?? new Date().toISOString(),
    // The alerts page also displays `service` — derive from condition or leave
    // empty. (We don't store service separately; the seed encodes it in the
    // condition + a leading service slug.)
    service: derivService(row.condition),
  }
}

function derivService(condition: string): string {
  // Best-effort: many of our seeded conditions reference a service implicitly
  // via the rule name; we can't recover that from the condition alone, so
  // return ''. Real deployments would store this as its own column or
  // attribute. Keeping this stable so the UI doesn't crash.
  return condition.includes('checkout')
    ? 'checkout'
    : condition.includes('search')
      ? 'search-index'
      : condition.includes('auth')
        ? 'auth-service'
        : condition.includes('billing')
          ? 'billing'
          : condition.includes('cdn')
            ? 'edge-cdn'
            : condition.includes('pipeline')
              ? 'data-pipeline'
              : ''
}

router.get('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    return
  }
  await seedDemoForUser(userId)
  const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
  const orderBy: OrderBy[] = [{ field: 'created_at', direction: 'asc' }]
  const rows = (await findMany<AlertRow>('alert_rules', { where, orderBy })) as AlertRow[]
  res.json(rows.map(decorate))
})

router.get('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    return
  }
  const idParam = req.params.id
  const id = Array.isArray(idParam) ? idParam[0] : idParam
  const row = await findById<AlertRow>('alert_rules', id)
  if (!row || row.user_id !== userId) {
    res.status(404).json({ error: t('alerts.notFound', {}, { defaultValue: 'Alert not found' }) })
    return
  }
  res.json(decorate(row))
})

router.post('/', validateBody(createAlertSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    return
  }
  await seedDemoForUser(userId)
  const body = req.body as z.infer<typeof createAlertSchema>
  const result = await create<AlertRow>('alert_rules', {
    user_id: userId,
    name: body.name,
    condition: body.condition ?? '',
    severity: body.severity ?? 'warning',
    channels: JSON.stringify(body.channels ?? []),
    status: 'monitoring',
    threshold: body.threshold ?? 1,
    window_seconds: body.window_seconds ?? 60,
    fire_count_24h: 0,
    last_fired_at: null,
    created_at: new Date(),
    updated_at: new Date(),
  })
  res.status(201).json(result.data ? decorate(result.data as AlertRow) : null)
})

router.patch('/:id', validateBody(updateAlertSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    return
  }
  const idParam = req.params.id
  const id = Array.isArray(idParam) ? idParam[0] : idParam
  const row = await findById<AlertRow>('alert_rules', id)
  if (!row || row.user_id !== userId) {
    res.status(404).json({ error: t('alerts.notFound', {}, { defaultValue: 'Alert not found' }) })
    return
  }
  const body = req.body as z.infer<typeof updateAlertSchema>
  const update: Record<string, unknown> = { updated_at: new Date() }
  if (body.name !== undefined) update.name = body.name
  if (body.condition !== undefined) update.condition = body.condition
  if (body.severity !== undefined) update.severity = body.severity
  if (body.channels !== undefined) update.channels = JSON.stringify(body.channels)
  if (body.status !== undefined) update.status = body.status
  const updated = await updateById<AlertRow>('alert_rules', id, update)
  res.json(updated.data ? decorate(updated.data as AlertRow) : null)
})

const silenceSchema = z.object({
  minutes: z
    .number()
    .int()
    .min(1)
    .max(24 * 60)
    .optional(),
})

router.post('/:id/silence', validateBody(silenceSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    return
  }
  const idParam = req.params.id
  const id = Array.isArray(idParam) ? idParam[0] : idParam
  const row = await findById<AlertRow>('alert_rules', id)
  if (!row || row.user_id !== userId) {
    res.status(404).json({ error: t('alerts.notFound', {}, { defaultValue: 'Alert not found' }) })
    return
  }
  const updated = await updateById<AlertRow>('alert_rules', id, {
    status: 'ok',
    updated_at: new Date(),
  })
  res.json(updated.data ? decorate(updated.data as AlertRow) : null)
})

export default router
