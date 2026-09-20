import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import type { WhereCondition } from '@molecule/api-database'
import { create, deleteById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'
import { authorizers } from '@molecule/api-resource-user'

import { requireOwnership, requireParentOwnership } from '../lib/authz.js'
import { seedDemoForUser } from './_seed.js'
import { asMap, shapeDailyLog } from './_shape.js'

const router = Router()

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export const WEATHER_CONDITIONS = [
  'sunny',
  'partly_cloudy',
  'cloudy',
  'rain',
  'snow',
  'wind',
  'extreme_heat',
  'extreme_cold',
] as const

const createLogSchema = z.object({
  project_id: z.string().uuid(),
  log_date: z.string().regex(DATE_RE),
  weather: z.enum(WEATHER_CONDITIONS).optional(),
  crew_count: z.number().int().min(0).max(10_000).optional(),
  hours: z.number().int().min(0).max(1_000_000).optional(),
  notes: z.string().max(4000).optional(),
  entries: z
    .array(
      z.object({
        area: z.string().min(1).max(200),
        work_performed: z.string().min(1).max(2000),
      }),
    )
    .max(50)
    .optional(),
})

const updateLogSchema = z.object({
  log_date: z.string().regex(DATE_RE).optional(),
  weather: z.enum(WEATHER_CONDITIONS).optional(),
  crew_count: z.number().int().min(0).max(10_000).optional(),
  hours: z.number().int().min(0).max(1_000_000).optional(),
  notes: z.string().max(4000).optional(),
})

const entryAddSchema = z.object({
  area: z.string().min(1).max(200),
  work_performed: z.string().min(1).max(2000),
})

/** Project rows for the owner, as an id→row lookup map. */
async function projectLookup(userId: string): Promise<Map<string, Record<string, unknown>>> {
  const rows = await findMany('projects', {
    where: [{ field: 'owner_id', operator: '=', value: userId }],
  })
  return asMap(rows as Array<Record<string, unknown>>, 'id')
}

/** Log-entry rows for many logs at once, grouped by log_id. */
async function entriesByLog(
  logIds: readonly string[],
): Promise<Map<string, Array<Record<string, unknown>>>> {
  const grouped = new Map<string, Array<Record<string, unknown>>>()
  if (logIds.length === 0) return grouped
  const rows = await findMany('log_entries', {
    where: [{ field: 'log_id', operator: 'in', value: [...logIds] }],
    orderBy: [{ field: 'created_at', direction: 'asc' }],
  })
  for (const r of rows as Array<Record<string, unknown>>) {
    const logId = typeof r.log_id === 'string' ? r.log_id : ''
    const bucket = grouped.get(logId)
    if (bucket) bucket.push(r)
    else grouped.set(logId, [r])
  }
  return grouped
}

router.use(authorizers.auth())

// List daily logs — owner-scoped, optional project/date filters. Seeds demo
// data on first authenticated call.
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    await seedDemoForUser(userId)
    const { project_id, date } = req.query
    const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: userId }]
    if (project_id && typeof project_id === 'string') {
      where.push({ field: 'project_id', operator: '=', value: project_id })
    }
    if (date && DATE_RE.test(String(date))) {
      where.push({ field: 'log_date', operator: '=', value: String(date) })
    }

    const logs = await findMany('daily_logs', {
      where,
      orderBy: [{ field: 'log_date', direction: 'desc' }],
      limit: 200,
    })
    const projectById = await projectLookup(userId)
    const entries = await entriesByLog(logs.map((l) => String((l as Record<string, unknown>).id)))
    res.json(
      logs.map((l) => {
        const id = String((l as Record<string, unknown>).id)
        return shapeDailyLog(l as Record<string, unknown>, projectById, entries.get(id) ?? [])
      }),
    )
  } catch (err) {
    logger.error('[daily-logs] list failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Get log details (with work-per-area entries) — owner-only.
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('daily_logs', req.params.id as string, userId)
    if (!check.ok) {
      res
        .status(check.status)
        .json({ error: t('dailyLogs.notFound', {}, { defaultValue: 'Daily log not found' }) })
      return
    }
    const projectById = await projectLookup(userId)
    const entries = await entriesByLog([req.params.id as string])
    res.json(
      shapeDailyLog(
        check.row as Record<string, unknown>,
        projectById,
        entries.get(req.params.id as string) ?? [],
      ),
    )
  } catch (err) {
    logger.error('[daily-logs] detail failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Create today's (or any dated) log with optional starter entries.
router.post('/', validateBody(createLogSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const body = req.body as z.infer<typeof createLogSchema>
    const projectCheck = await requireOwnership('projects', body.project_id, userId)
    if (!projectCheck.ok) {
      res.status(projectCheck.status).json({
        error: t('projects.notFound', {}, { defaultValue: 'Project not found' }),
      })
      return
    }
    // One log per project per date — return the existing one instead of a dupe.
    const existing = await findMany('daily_logs', {
      where: [
        { field: 'project_id', operator: '=', value: body.project_id },
        { field: 'log_date', operator: '=', value: body.log_date },
      ],
    })
    if (existing.length > 0) {
      res.status(409).json({
        error: t(
          'dailyLogs.alreadyExists',
          {},
          { defaultValue: 'A log already exists for this project and date' },
        ),
      })
      return
    }

    const now = new Date().toISOString()
    const result = await create('daily_logs', {
      owner_id: userId,
      project_id: body.project_id,
      log_date: body.log_date,
      weather: body.weather ?? '',
      crew_count: body.crew_count ?? 0,
      hours: body.hours ?? 0,
      notes: body.notes ?? '',
      created_at: now,
      updated_at: now,
    })
    const logId = (result.data as { id?: string } | null)?.id ?? ''
    if (logId && body.entries?.length) {
      for (const e of body.entries) {
        await create('log_entries', {
          log_id: logId,
          area: e.area,
          work_performed: e.work_performed,
          created_at: now,
        })
      }
    }
    const projectById = await projectLookup(userId)
    const entries = await entriesByLog([logId])
    res
      .status(201)
      .json(
        shapeDailyLog(
          result.data as Record<string, unknown>,
          projectById,
          entries.get(logId) ?? [],
        ),
      )
  } catch (err) {
    logger.error('[daily-logs] create failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Update log fields — owner-only.
router.put('/:id', validateBody(updateLogSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('daily_logs', req.params.id as string, userId)
    if (!check.ok) {
      res
        .status(check.status)
        .json({ error: t('dailyLogs.notFound', {}, { defaultValue: 'Daily log not found' }) })
      return
    }
    const body = req.body as z.infer<typeof updateLogSchema>
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    for (const key of ['log_date', 'weather', 'crew_count', 'hours', 'notes'] as const) {
      if (body[key] !== undefined) updates[key] = body[key]
    }
    const result = await updateById('daily_logs', req.params.id as string, updates)
    const projectById = await projectLookup(userId)
    const entries = await entriesByLog([req.params.id as string])
    res.json(
      shapeDailyLog(
        result.data as Record<string, unknown>,
        projectById,
        entries.get(req.params.id as string) ?? [],
      ),
    )
  } catch (err) {
    logger.error('[daily-logs] update failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Add a work-performed entry to a log.
router.post('/:id/entries', validateBody(entryAddSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('daily_logs', req.params.id as string, userId)
    if (!check.ok) {
      res
        .status(check.status)
        .json({ error: t('dailyLogs.notFound', {}, { defaultValue: 'Daily log not found' }) })
      return
    }
    const body = req.body as z.infer<typeof entryAddSchema>
    const now = new Date().toISOString()
    const result = await create('log_entries', {
      log_id: req.params.id as string,
      area: body.area,
      work_performed: body.work_performed,
      created_at: now,
    })
    res.status(201).json(result.data)
  } catch (err) {
    logger.error('[daily-logs] entry add failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Remove a log entry.
router.delete('/:id/entries/:entryId', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireParentOwnership(
      'log_entries',
      req.params.entryId as string,
      'daily_logs',
      'log_id',
      userId,
    )
    if (!check.ok) {
      res
        .status(check.status)
        .json({ error: t('dailyLogs.entryNotFound', {}, { defaultValue: 'Log entry not found' }) })
      return
    }
    await deleteById('log_entries', req.params.entryId as string)
    res.status(204).end()
  } catch (err) {
    logger.error('[daily-logs] entry delete failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Delete log — owner-only (entries go with it).
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('daily_logs', req.params.id as string, userId)
    if (!check.ok) {
      res
        .status(check.status)
        .json({ error: t('dailyLogs.notFound', {}, { defaultValue: 'Daily log not found' }) })
      return
    }
    const entries = await entriesByLog([req.params.id as string])
    for (const e of entries.get(req.params.id as string) ?? []) {
      if (typeof e.id === 'string') await deleteById('log_entries', e.id)
    }
    await deleteById('daily_logs', req.params.id as string)
    res.status(204).end()
  } catch (err) {
    logger.error('[daily-logs] delete failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
