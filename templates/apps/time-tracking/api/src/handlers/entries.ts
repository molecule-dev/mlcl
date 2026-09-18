import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const startTimerSchema = z.object({
  description: z.string().optional(),
  project_id: z.string().uuid().optional().nullable(),
  is_billable: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
})

const createEntrySchema = z.object({
  description: z.string().optional(),
  project_id: z.string().uuid().optional().nullable(),
  started_at: z.string(),
  ended_at: z.string(),
  is_billable: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
})

const updateEntrySchema = z.object({
  description: z.string().optional(),
  project_id: z.string().uuid().optional().nullable(),
  started_at: z.string().optional(),
  ended_at: z.string().optional().nullable(),
  is_billable: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
})

// Compute duration in seconds between two timestamps.
function computeDurationSeconds(start: Date, end: Date): number {
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000))
}

// Resolve an entry's billability from its project's `billable` flag. The per-project "Time on this
// project is billable" toggle was stored but every entry-create path hardcoded `is_billable ?? true`,
// so unchecking it did nothing — the time still billed and counted as billable. A non-billable
// project forces its entries non-billable; a billable (or absent) project honors the requested flag.
async function resolveIsBillable(
  projectId: string | null | undefined,
  requested: boolean | undefined,
): Promise<boolean> {
  const provided = requested ?? true
  if (!projectId) return provided
  const project = await findById<{ billable?: boolean }>('projects', String(projectId))
  return project?.billable === false ? false : provided
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const { project_id, start_date, end_date, limit, offset } = req.query
    const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: userId }]
    if (project_id) where.push({ field: 'project_id', operator: '=', value: project_id })
    if (start_date) where.push({ field: 'started_at', operator: '>=', value: start_date })
    if (end_date) where.push({ field: 'started_at', operator: '<=', value: end_date })

    const orderBy: OrderBy[] = [{ field: 'started_at', direction: 'desc' }]
    const items = await findMany('time_entries', {
      where,
      orderBy,
      limit: Number(limit) || 100,
      offset: Number(offset) || 0,
    })
    res.json(items)
  } catch (err: unknown) {
    console.error('[time-tracking handler] internal error:', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

// Currently-running timer (ended_at IS NULL) — at most one per user.
router.get('/running', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const where: WhereCondition[] = [
      { field: 'owner_id', operator: '=', value: userId },
      { field: 'ended_at', operator: 'is_null', value: null },
    ]
    const items = await findMany<Record<string, unknown>>('time_entries', { where, limit: 1 })
    res.json(items.length > 0 ? items[0] : null)
  } catch (err: unknown) {
    console.error('[time-tracking handler] internal error:', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = getParamId(req)
    const entry = await findById<Record<string, unknown>>('time_entries', id)
    if (!entry || entry.owner_id !== userId) {
      return res
        .status(404)
        .json({ error: t('entry.notFound', {}, { defaultValue: 'Entry not found' }) })
    }
    res.json(entry)
  } catch (err: unknown) {
    console.error('[time-tracking handler] internal error:', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

// Start a new timer. Per INVENTORY flow 2 (single-running-timer enforcement),
// we auto-stop any existing running timer for the same user before starting a
// new one — this matches the "auto-stop-and-restart" choice noted in
// INVENTORY's open questions.
router.post('/start', validateBody(startTimerSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    // Stop any currently running timer.
    const running = await findMany<Record<string, unknown>>('time_entries', {
      where: [
        { field: 'owner_id', operator: '=', value: userId },
        { field: 'ended_at', operator: 'is_null', value: null },
      ],
      limit: 1,
    })
    if (running.length > 0) {
      const r = running[0] as { id: string; started_at: string }
      const endedAt = new Date()
      const duration = computeDurationSeconds(new Date(r.started_at), endedAt)
      await updateById('time_entries', r.id, {
        ended_at: endedAt,
        duration_seconds: duration,
        updated_at: endedAt,
      })
    }

    const { description, project_id, is_billable, tags } = req.body
    const startedAt = new Date()
    const result = await create('time_entries', {
      owner_id: userId,
      project_id: project_id ?? null,
      description: description ?? '',
      started_at: startedAt,
      ended_at: null,
      duration_seconds: null,
      is_billable: await resolveIsBillable(project_id, is_billable),
      tags: tags ?? [],
      invoiced: false,
      created_at: startedAt,
      updated_at: startedAt,
    })
    res.status(201).json((result as { data?: unknown }).data ?? result)
  } catch (err: unknown) {
    console.error('[time-tracking handler] internal error:', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

// Stop the currently-running timer for the user.
router.post('/stop', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const running = await findMany<Record<string, unknown>>('time_entries', {
      where: [
        { field: 'owner_id', operator: '=', value: userId },
        { field: 'ended_at', operator: 'is_null', value: null },
      ],
      limit: 1,
    })
    if (running.length === 0) {
      return res
        .status(404)
        .json({ error: t('timer.noRunning', {}, { defaultValue: 'No running timer' }) })
    }
    const entry = running[0] as { id: string; started_at: string }
    const endedAt = new Date()
    const duration = computeDurationSeconds(new Date(entry.started_at), endedAt)
    const result = await updateById('time_entries', entry.id, {
      ended_at: endedAt,
      duration_seconds: duration,
      updated_at: endedAt,
    })
    res.json((result as { data?: unknown }).data ?? result)
  } catch (err: unknown) {
    console.error('[time-tracking handler] internal error:', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

// Manual entry with explicit start/end.
router.post('/', validateBody(createEntrySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const { description, project_id, started_at, ended_at, is_billable, tags } = req.body
    const start = new Date(started_at)
    const end = new Date(ended_at)
    const duration = computeDurationSeconds(start, end)
    const result = await create('time_entries', {
      owner_id: userId,
      project_id: project_id ?? null,
      description: description ?? '',
      started_at: start,
      ended_at: end,
      duration_seconds: duration,
      is_billable: await resolveIsBillable(project_id, is_billable),
      tags: tags ?? [],
      invoiced: false,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json((result as { data?: unknown }).data ?? result)
  } catch (err: unknown) {
    console.error('[time-tracking handler] internal error:', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.put('/:id', validateBody(updateEntrySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('time_entries', id)
    if (!existing || existing.owner_id !== userId) {
      return res
        .status(404)
        .json({ error: t('entry.notFound', {}, { defaultValue: 'Entry not found' }) })
    }

    const updates: Record<string, unknown> = { updated_at: new Date() }
    for (const field of ['description', 'project_id', 'tags']) {
      if (field in req.body) updates[field] = req.body[field]
    }
    // Recompute billability when the project or the flag changes, so reassigning an entry to a
    // non-billable project (or back) honors the project's billable flag rather than the raw input.
    if ('project_id' in req.body || 'is_billable' in req.body) {
      const effProjectId = (
        'project_id' in req.body ? req.body.project_id : existing.project_id
      ) as string | null | undefined
      const effRequested = (
        'is_billable' in req.body ? req.body.is_billable : existing.is_billable
      ) as boolean | undefined
      updates.is_billable = await resolveIsBillable(effProjectId, effRequested)
    }
    if ('started_at' in req.body && req.body.started_at != null) {
      updates.started_at = new Date(req.body.started_at)
    }
    if ('ended_at' in req.body) {
      updates.ended_at = req.body.ended_at == null ? null : new Date(req.body.ended_at)
    }
    if (updates.started_at && updates.ended_at) {
      updates.duration_seconds = computeDurationSeconds(
        updates.started_at as Date,
        updates.ended_at as Date,
      )
    }
    const result = await updateById('time_entries', id, updates)
    res.json((result as { data?: unknown }).data ?? result)
  } catch (err: unknown) {
    console.error('[time-tracking handler] internal error:', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('time_entries', id)
    if (!existing || existing.owner_id !== userId) {
      return res
        .status(404)
        .json({ error: t('entry.notFound', {}, { defaultValue: 'Entry not found' }) })
    }
    await deleteById('time_entries', id)
    res.status(204).end()
  } catch (err: unknown) {
    console.error('[time-tracking handler] internal error:', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
