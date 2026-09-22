/**
 * log-viewer — incidents.
 *
 * GET /     — list (filter by ?status=open|resolved)
 * GET /:id  — detail
 * POST /    — declare a new incident
 * PATCH /:id — change status or owner; setting status=resolved sets resolved_at=now()
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

import { isUuid, route } from './_http.js'
import { seedDemoForUser } from './_seed.js'

const router = Router()

interface IncidentRow {
  id: string
  user_id: string
  title: string
  severity: string
  status: string
  service: string | null
  owner: string | null
  started_at: Date | string | null
  resolved_at: Date | string | null
  impacted_users: number
  alert_rule_id: string | null
  created_at: Date
  updated_at: Date
}

const VALID_STATUSES = ['open', 'investigating', 'mitigated', 'monitoring', 'resolved'] as const
const VALID_SEVERITIES = ['sev1', 'sev2', 'sev3', 'sev4'] as const

const createIncidentSchema = z.object({
  title: z.string().min(1).max(500),
  service: z.string().max(255).optional(),
  severity: z.enum(VALID_SEVERITIES).optional(),
  owner: z.string().max(255).optional(),
  impacted_users: z.number().int().min(0).optional(),
  alert_rule_id: z.string().uuid().optional(),
})

const updateIncidentSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  service: z.string().max(255).optional(),
  severity: z.enum(VALID_SEVERITIES).optional(),
  status: z.enum(VALID_STATUSES).optional(),
  owner: z.string().max(255).optional(),
  impacted_users: z.number().int().min(0).optional(),
})

function toIso(d: Date | string | null): string | null {
  if (d === null || d === undefined) return null
  if (d instanceof Date) return d.toISOString()
  if (typeof d === 'string') return d
  return null
}

function decorate(row: IncidentRow): Record<string, unknown> {
  return {
    id: row.id,
    title: row.title,
    severity: row.severity,
    status: row.status,
    service: row.service ?? '',
    owner: row.owner ?? '',
    started_at: toIso(row.started_at) ?? new Date().toISOString(),
    resolved_at: toIso(row.resolved_at),
    impacted_users: row.impacted_users,
    alert_rule_id: row.alert_rule_id,
  }
}

router.get(
  '/',
  route('incidents.list', async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
      return
    }
    await seedDemoForUser(userId)
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    const status = typeof req.query.status === 'string' ? req.query.status : undefined
    if (status === 'resolved') {
      where.push({ field: 'status', operator: '=', value: 'resolved' })
    } else if (status === 'open') {
      where.push({ field: 'status', operator: '!=', value: 'resolved' })
    }
    const orderBy: OrderBy[] = [{ field: 'started_at', direction: 'desc' }]
    const rows = (await findMany<IncidentRow>('incidents', { where, orderBy })) as IncidentRow[]
    res.json(rows.map(decorate))
  }),
)

router.get(
  '/:id',
  route('incidents.get', async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
      return
    }
    const idParam = req.params.id
    const id = Array.isArray(idParam) ? idParam[0] : idParam
    // Malformed id must 404 — the column is uuid and Postgres would 500.
    if (!isUuid(id)) {
      res
        .status(404)
        .json({ error: t('incidents.notFound', {}, { defaultValue: 'Incident not found' }) })
      return
    }
    const row = await findById<IncidentRow>('incidents', id)
    if (!row || row.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('incidents.notFound', {}, { defaultValue: 'Incident not found' }) })
      return
    }
    res.json(decorate(row))
  }),
)

router.post(
  '/',
  validateBody(createIncidentSchema),
  route('incidents.create', async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
      return
    }
    await seedDemoForUser(userId)
    const body = req.body as z.infer<typeof createIncidentSchema>
    const result = await create<IncidentRow>('incidents', {
      user_id: userId,
      title: body.title,
      severity: body.severity ?? 'sev3',
      status: 'open',
      service: body.service ?? null,
      owner: body.owner ?? null,
      started_at: new Date(),
      resolved_at: null,
      impacted_users: body.impacted_users ?? 0,
      alert_rule_id: body.alert_rule_id ?? null,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(result.data ? decorate(result.data as IncidentRow) : null)
  }),
)

router.patch(
  '/:id',
  validateBody(updateIncidentSchema),
  route('incidents.update', async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
      return
    }
    const idParam = req.params.id
    const id = Array.isArray(idParam) ? idParam[0] : idParam
    // Malformed id must 404 — the column is uuid and Postgres would 500.
    if (!isUuid(id)) {
      res
        .status(404)
        .json({ error: t('incidents.notFound', {}, { defaultValue: 'Incident not found' }) })
      return
    }
    const row = await findById<IncidentRow>('incidents', id)
    if (!row || row.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('incidents.notFound', {}, { defaultValue: 'Incident not found' }) })
      return
    }
    const body = req.body as z.infer<typeof updateIncidentSchema>
    const update: Record<string, unknown> = { updated_at: new Date() }
    if (body.title !== undefined) update.title = body.title
    if (body.service !== undefined) update.service = body.service
    if (body.severity !== undefined) update.severity = body.severity
    if (body.owner !== undefined) update.owner = body.owner
    if (body.impacted_users !== undefined) update.impacted_users = body.impacted_users
    if (body.status !== undefined) {
      update.status = body.status
      if (body.status === 'resolved' && !row.resolved_at) {
        update.resolved_at = new Date()
      } else if (body.status !== 'resolved' && row.resolved_at) {
        update.resolved_at = null
      }
    }
    const updated = await updateById<IncidentRow>('incidents', id, update)
    res.json(updated.data ? decorate(updated.data as IncidentRow) : null)
  }),
)

export default router
