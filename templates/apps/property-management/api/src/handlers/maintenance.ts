/**
 * Maintenance handler — owner-scoped CRUD over the
 * `maintenance_requests` table via the abstract DataStore. All queries
 * scope by session userId; detail / update / delete reject IDOR via
 * `requireUserOwnership` (G6).
 *
 * Errors bubble — no try/catch swallowing.
 *
 * Also exposes per-request /messages for tenant↔owner correspondence
 * (read-after-write capable thread).
 */
import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import {
  count,
  create,
  deleteById,
  findMany,
  updateById,
  type WhereCondition,
} from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import { requireUserOwnership } from '../lib/authz.js'
import type { PropertyManagementLimits } from '../tiers.js'
import { isUuid } from './_uuid.js'

const router = Router()

const createMaintenanceSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  property_id: z.string().nullable().optional(),
  unit_id: z.string().nullable().optional(),
  tenant_id: z.string().nullable().optional(),
  priority: z.enum(['low', 'normal', 'medium', 'high', 'urgent']).optional(),
  status: z.enum(['open', 'scheduled', 'in_progress', 'completed', 'cancelled']).optional(),
  assigned_to: z.string().nullable().optional(),
  scheduled_at: z.string().nullable().optional(),
})

const updateMaintenanceSchema = createMaintenanceSchema.partial()

interface MaintenanceRow {
  id: string
  user_id: string
  property_id: string | null
  unit_id: string | null
  tenant_id: string | null
  title: string
  description: string | null
  priority: string
  status: string
  assigned_to: string | null
  opened_at: string | Date
  scheduled_at: string | Date | null
  completed_at: string | Date | null
  created_at: string | Date
  updatedAt: string | Date | null
}

function normalizePriority(p?: string): string {
  if (p === 'medium') return 'normal'
  return p ?? 'normal'
}

function serializeMaintenance(
  row: MaintenanceRow,
): MaintenanceRow & { submitted_at: string | Date } {
  const submitted = row.opened_at ?? row.created_at
  const priorityOut = row.priority === 'normal' ? 'medium' : row.priority
  return { ...row, priority: priorityOut, submitted_at: submitted }
}

const assignSchema = z.object({
  assigned_to: z.string().min(1),
})

const completeSchema = z.object({
  resolution_notes: z.string().optional(),
  cost: z.number().nonnegative().optional(),
})

const messageSchema = z.object({
  body: z.string().min(1),
  attachments: z.array(z.unknown()).optional(),
})

router.get('/', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
    return
  }
  const { property_id, unit_id, status, priority, page = '1', limit = '50' } = req.query
  // property_id/unit_id are uuid columns — a non-UUID filter would make the
  // query throw 22P02 (a 500). A non-UUID id matches no rows by definition.
  if (property_id && !isUuid(property_id)) {
    res.json([])
    return
  }
  if (unit_id && !isUuid(unit_id)) {
    res.json([])
    return
  }
  const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
  if (property_id) where.push({ field: 'property_id', operator: '=', value: String(property_id) })
  if (unit_id) where.push({ field: 'unit_id', operator: '=', value: String(unit_id) })
  if (status) where.push({ field: 'status', operator: '=', value: String(status) })
  if (priority) where.push({ field: 'priority', operator: '=', value: String(priority) })
  const rows = await findMany<MaintenanceRow>('maintenance_requests', {
    where,
    orderBy: [{ field: 'created_at', direction: 'desc' }],
    limit: Number(limit),
    offset: (Number(page) - 1) * Number(limit),
  })
  res.json(rows.map(serializeMaintenance))
})

router.get('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
    return
  }
  const check = await requireUserOwnership('maintenance_requests', getParamId(req), userId)
  if (!check.ok) {
    res
      .status(check.status)
      .json({ error: t('maintenance.notFound', undefined, { defaultValue: 'Request not found' }) })
    return
  }
  res.json(serializeMaintenance(check.row as unknown as MaintenanceRow))
})

router.post(
  '/',
  enforceLimit<PropertyManagementLimits>({
    limitType: 'maxMaintenance',
    getLimit: (limits) => limits.maxMaintenance,
    getCurrent: async (userId) =>
      count('maintenance_requests', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createMaintenanceSchema),
  async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
      return
    }
    const result = await create<MaintenanceRow>('maintenance_requests', {
      ...req.body,
      user_id: userId,
      status: req.body.status ?? 'open',
      priority: normalizePriority(req.body.priority as string | undefined),
      created_at: new Date(),
    })
    const row = ((result as { data?: MaintenanceRow }).data ?? result) as MaintenanceRow
    res.status(201).json(serializeMaintenance(row))
  },
)

router.put('/:id', validateBody(updateMaintenanceSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
    return
  }
  const id = getParamId(req)
  const check = await requireUserOwnership('maintenance_requests', id, userId)
  if (!check.ok) {
    res
      .status(check.status)
      .json({ error: t('maintenance.notFound', undefined, { defaultValue: 'Request not found' }) })
    return
  }
  const body = { ...req.body }
  if (body.priority) body.priority = normalizePriority(body.priority)
  const result = await updateById<MaintenanceRow>('maintenance_requests', id, {
    ...body,
    updatedAt: new Date(),
  })
  const row = ((result as { data?: MaintenanceRow }).data ?? result) as MaintenanceRow
  res.json(serializeMaintenance(row))
})

router.put('/:id/assign', validateBody(assignSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
    return
  }
  const id = getParamId(req)
  const check = await requireUserOwnership('maintenance_requests', id, userId)
  if (!check.ok) {
    res
      .status(check.status)
      .json({ error: t('maintenance.notFound', undefined, { defaultValue: 'Request not found' }) })
    return
  }
  const result = await updateById<MaintenanceRow>('maintenance_requests', id, {
    assigned_to: req.body.assigned_to,
    status: 'in_progress',
    updatedAt: new Date(),
  })
  const row = ((result as { data?: MaintenanceRow }).data ?? result) as MaintenanceRow
  res.json(serializeMaintenance(row))
})

router.put('/:id/complete', validateBody(completeSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
    return
  }
  const id = getParamId(req)
  const check = await requireUserOwnership('maintenance_requests', id, userId)
  if (!check.ok) {
    res
      .status(check.status)
      .json({ error: t('maintenance.notFound', undefined, { defaultValue: 'Request not found' }) })
    return
  }
  const result = await updateById<MaintenanceRow>('maintenance_requests', id, {
    status: 'completed',
    completed_at: new Date(),
    resolution_notes: req.body.resolution_notes,
    cost: req.body.cost,
    updatedAt: new Date(),
  })
  const row = ((result as { data?: MaintenanceRow }).data ?? result) as MaintenanceRow
  res.json(serializeMaintenance(row))
})

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
    return
  }
  const id = getParamId(req)
  const check = await requireUserOwnership('maintenance_requests', id, userId)
  if (!check.ok) {
    res
      .status(check.status)
      .json({ error: t('maintenance.notFound', undefined, { defaultValue: 'Request not found' }) })
    return
  }
  await deleteById('maintenance_requests', id)
  res.status(204).end()
})

router.get('/:id/messages', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
    return
  }
  const id = getParamId(req)
  const check = await requireUserOwnership('maintenance_requests', id, userId)
  if (!check.ok) {
    res
      .status(check.status)
      .json({ error: t('maintenance.notFound', undefined, { defaultValue: 'Request not found' }) })
    return
  }
  const rows = await findMany('maintenance_messages', {
    where: [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'maintenance_request_id', operator: '=', value: id },
    ],
    orderBy: [{ field: 'created_at', direction: 'asc' }],
    limit: 200,
  })
  res.json(rows)
})

router.post('/:id/messages', validateBody(messageSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
    return
  }
  const id = getParamId(req)
  const check = await requireUserOwnership('maintenance_requests', id, userId)
  if (!check.ok) {
    res
      .status(check.status)
      .json({ error: t('maintenance.notFound', undefined, { defaultValue: 'Request not found' }) })
    return
  }
  const result = await create('maintenance_messages', {
    user_id: userId,
    maintenance_request_id: id,
    author_user_id: userId,
    body: req.body.body,
    attachments: req.body.attachments,
    created_at: new Date(),
  })
  const data = (result as { data?: unknown }).data ?? result
  res.status(201).json(data)
})

export default router
