/**
 * Task handlers — owner-scoped CRUD with reorder + complete-with-recurrence.
 *
 * Uses the abstract DataStore from @molecule/api-database (no raw SQL).
 * Every handler scopes by owner_id = session.userId so other users' rows
 * are unreachable. Inputs are validated with zod schemas declared inline;
 * the bond is loaded transitively via @molecule/api-utilities-validation.
 *
 * Wire-format normalisation: list endpoints return enriched task objects
 * (project: { id, name } | null, labels: string[], completed: boolean,
 * due_date as 'YYYY-MM-DD' string or null) so the frontend doesn't need
 * a custom adapter for every page. Every list view renders the same
 * `Task` shape.
 */

import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { requireUser } from '@molecule/api-bonds-default-express'
import {
  count,
  create,
  deleteById,
  findMany,
  findOne,
  updateById,
  type WhereCondition,
} from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'

import type { ToDoListLimits } from '../tiers.js'

const router = Router()

const taskCreateSchema = z.object({
  title: z.string().min(1).max(1000),
  description: z.string().max(10_000).optional(),
  project_id: z.string().uuid().nullable().optional(),
  parent_id: z.string().uuid().nullable().optional(),
  priority: z.number().int().min(1).max(4).optional(),
  due_date: z.string().nullable().optional(),
  due_time: z.string().nullable().optional(),
  recurrence_rule: z.string().nullable().optional(),
  position: z.number().optional(),
})

const taskUpdateSchema = taskCreateSchema.partial().extend({
  is_completed: z.boolean().optional(),
})

const reorderSchema = z.object({
  tasks: z
    .array(
      z.object({
        id: z.string().uuid(),
        position: z.number(),
        project_id: z.string().uuid().nullable().optional(),
      }),
    )
    .min(1),
})

const idParam = z.object({ id: z.string().uuid() })

interface TaskRow {
  id: string
  owner_id: string
  project_id: string | null
  parent_id: string | null
  title: string
  description: string | null
  priority: number
  due_date: string | Date | null
  due_time: string | null
  recurrence_rule: string | null
  position: number | string
  is_completed: boolean
  completed_at: string | Date | null
  created_at: string | Date
  updated_at: string | Date
}

interface ProjectRow {
  id: string
  name: string
  color: string
}

interface LabelRow {
  id: string
  name: string
}

interface EnrichedTask {
  id: string
  title: string
  description: string | null
  priority: 1 | 2 | 3 | 4
  due_date: string | null
  due_time: string | null
  project_id: string | null
  parent_id: string | null
  project: { id: string; name: string; color: string } | null
  labels: string[]
  completed: boolean
  completed_at: string | null
  recurrence_rule: string | null
  recurring: 'daily' | 'weekly' | 'monthly' | 'yearly' | null
  position: number
  created_at: string
  updated_at: string
}

// PostgreSQL DATE columns come back from `pg` as Date objects pinned
// to midnight in the *server's local* timezone (e.g. 2026-05-10 stored
// becomes `Sun May 10 2026 00:00:00 GMT+0300`). toISOString() shifts to
// UTC and lands on the previous day in any TZ east of UTC. Read the
// local components instead so the wire value always matches what the
// user typed regardless of where the server is hosted.
function toDateString(value: string | Date | null): string | null {
  if (value === null || value === undefined) return null
  if (value instanceof Date) {
    const y = value.getFullYear()
    const m = String(value.getMonth() + 1).padStart(2, '0')
    const d = String(value.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  if (typeof value === 'string') {
    if (value.length >= 10) return value.slice(0, 10)
    return value
  }
  return null
}

function toIsoString(value: string | Date | null): string | null {
  if (value === null || value === undefined) return null
  if (value instanceof Date) return value.toISOString()
  return String(value)
}

function priorityFromDb(raw: number | null | undefined): 1 | 2 | 3 | 4 {
  const n = typeof raw === 'number' ? raw : 0
  if (n >= 1 && n <= 4) return n as 1 | 2 | 3 | 4
  return 4
}

function recurringSummary(rule: string | null): EnrichedTask['recurring'] {
  if (!rule) return null
  const m = rule.match(/^every\s+\d+\s+(day|week|month|year)s?$/i)
  if (!m) return null
  const unit = m[1].toLowerCase()
  if (unit === 'day') return 'daily'
  if (unit === 'week') return 'weekly'
  if (unit === 'month') return 'monthly'
  if (unit === 'year') return 'yearly'
  return null
}

function buildEnricher(
  projectsById: Map<string, ProjectRow>,
  labelsByTaskId: Map<string, string[]>,
) {
  return (task: TaskRow): EnrichedTask => ({
    id: task.id,
    title: task.title,
    description: task.description ?? null,
    priority: priorityFromDb(task.priority),
    due_date: toDateString(task.due_date),
    due_time: task.due_time ?? null,
    project_id: task.project_id ?? null,
    parent_id: task.parent_id ?? null,
    project:
      task.project_id && projectsById.has(task.project_id)
        ? {
            id: projectsById.get(task.project_id)!.id,
            name: projectsById.get(task.project_id)!.name,
            color: projectsById.get(task.project_id)!.color,
          }
        : null,
    labels: labelsByTaskId.get(task.id) ?? [],
    completed: !!task.is_completed,
    completed_at: toIsoString(task.completed_at),
    recurrence_rule: task.recurrence_rule ?? null,
    recurring: recurringSummary(task.recurrence_rule),
    position: typeof task.position === 'number' ? task.position : Number(task.position ?? 0),
    created_at: toIsoString(task.created_at) ?? '',
    updated_at: toIsoString(task.updated_at) ?? '',
  })
}

// Fetch projects + label join rows + label rows in parallel, then build
// quick lookup maps so each list response can be enriched in a single
// pass without N additional queries per task.
async function loadEnricher(
  ownerId: string,
  taskIds: string[],
): Promise<(task: TaskRow) => EnrichedTask> {
  const [projects, joins] = await Promise.all([
    findMany<ProjectRow>('projects', {
      where: [{ field: 'owner_id', operator: '=', value: ownerId }],
    }),
    taskIds.length === 0
      ? Promise.resolve([] as { task_id: string; label_id: string }[])
      : findMany<{ task_id: string; label_id: string }>('task_labels', {
          where: [
            { field: 'owner_id', operator: '=', value: ownerId },
            { field: 'task_id', operator: 'in', value: taskIds },
          ],
        }),
  ])
  const labelIds = [...new Set(joins.map((j) => j.label_id))]
  const labels =
    labelIds.length === 0
      ? []
      : await findMany<LabelRow>('labels', {
          where: [
            { field: 'owner_id', operator: '=', value: ownerId },
            { field: 'id', operator: 'in', value: labelIds },
          ],
        })
  const labelById = new Map(labels.map((l) => [l.id, l.name]))
  const labelsByTaskId = new Map<string, string[]>()
  for (const j of joins) {
    const name = labelById.get(j.label_id)
    if (!name) continue
    const arr = labelsByTaskId.get(j.task_id) ?? []
    arr.push(name)
    labelsByTaskId.set(j.task_id, arr)
  }
  const projectsById = new Map(projects.map((p) => [p.id, p]))
  return buildEnricher(projectsById, labelsByTaskId)
}

async function enrichOne(ownerId: string, task: TaskRow): Promise<EnrichedTask> {
  const enrich = await loadEnricher(ownerId, [task.id])
  return enrich(task)
}

async function enrichMany(ownerId: string, tasks: TaskRow[]): Promise<EnrichedTask[]> {
  const enrich = await loadEnricher(
    ownerId,
    tasks.map((t) => t.id),
  )
  return tasks.map(enrich)
}

router.get('/', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  try {
    const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: ownerId }]
    const { project_id, label_id, completed, due_date, filter } = req.query
    if (typeof project_id === 'string' && project_id) {
      where.push({ field: 'project_id', operator: '=', value: project_id })
    }
    if (typeof completed === 'string') {
      where.push({ field: 'is_completed', operator: '=', value: completed === 'true' })
    }
    if (typeof due_date === 'string' && due_date) {
      where.push({ field: 'due_date', operator: '=', value: due_date })
    }
    // ?filter=inbox => unsorted (no project), ?filter=upcoming => has due_date
    if (filter === 'inbox') {
      where.push({ field: 'project_id', operator: 'is_null' })
    } else if (filter === 'upcoming') {
      where.push({ field: 'due_date', operator: 'is_not_null' })
      where.push({ field: 'is_completed', operator: '=', value: false })
    }
    if (typeof label_id === 'string' && label_id) {
      const joins = await findMany<{ task_id: string }>('task_labels', {
        where: [
          { field: 'owner_id', operator: '=', value: ownerId },
          { field: 'label_id', operator: '=', value: label_id },
        ],
      })
      const ids = joins.map((j) => j.task_id)
      if (ids.length === 0) {
        res.json([])
        return
      }
      where.push({ field: 'id', operator: 'in', value: ids })
    }
    const items = await findMany<TaskRow>('tasks', {
      where,
      orderBy: [{ field: 'position', direction: 'asc' }],
    })
    res.json(await enrichMany(ownerId, items))
  } catch (err) {
    console.error('GET /tasks failed:', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/today', async (_req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  try {
    const today = new Date().toISOString().split('T')[0]
    const items = await findMany<TaskRow>('tasks', {
      where: [
        { field: 'owner_id', operator: '=', value: ownerId },
        { field: 'due_date', operator: '=', value: today },
        { field: 'is_completed', operator: '=', value: false },
      ],
      orderBy: [
        { field: 'priority', direction: 'desc' },
        { field: 'position', direction: 'asc' },
      ],
    })
    res.json(await enrichMany(ownerId, items))
  } catch (err) {
    console.error('GET /tasks/today failed:', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/upcoming', async (_req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  try {
    const items = await findMany<TaskRow>('tasks', {
      where: [
        { field: 'owner_id', operator: '=', value: ownerId },
        { field: 'is_completed', operator: '=', value: false },
        { field: 'due_date', operator: 'is_not_null' },
      ],
      orderBy: [
        { field: 'due_date', direction: 'asc' },
        { field: 'priority', direction: 'desc' },
      ],
    })
    res.json(await enrichMany(ownerId, items))
  } catch (err) {
    console.error('GET /tasks/upcoming failed:', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/search', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : ''
  if (!q) {
    res.json([])
    return
  }
  try {
    // `ilike` performs an owner-scoped, case-insensitive substring
    // search at the DB layer (the bond wraps the value with %…% and
    // escapes wildcards). Capped at 50 to keep the response small.
    const matches = await findMany<TaskRow>('tasks', {
      where: [
        { field: 'owner_id', operator: '=', value: ownerId },
        { field: 'title', operator: 'ilike', value: q },
      ],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 50,
    })
    res.json(await enrichMany(ownerId, matches))
  } catch (err) {
    console.error('GET /tasks/search failed:', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/completed', async (_req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  try {
    const items = await findMany<TaskRow>('tasks', {
      where: [
        { field: 'owner_id', operator: '=', value: ownerId },
        { field: 'is_completed', operator: '=', value: true },
      ],
      orderBy: [{ field: 'completed_at', direction: 'desc' }],
      limit: 100,
    })
    res.json(await enrichMany(ownerId, items))
  } catch (err) {
    console.error('GET /tasks/completed failed:', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/reorder', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const parsed = reorderSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      issues: parsed.error.issues,
    })
    return
  }
  try {
    for (const item of parsed.data.tasks) {
      const owned = await findOne<TaskRow>('tasks', [
        { field: 'id', operator: '=', value: item.id },
        { field: 'owner_id', operator: '=', value: ownerId },
      ])
      if (!owned) continue
      await updateById<TaskRow>('tasks', item.id, {
        position: item.position,
        ...(item.project_id !== undefined ? { project_id: item.project_id } : {}),
        updated_at: new Date(),
      })
    }
    res.json({ reordered: true })
  } catch (err) {
    console.error('POST /tasks/reorder failed:', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    res
      .status(400)
      .json({ error: t('validation.failed', {}, { defaultValue: 'Validation failed' }) })
    return
  }
  try {
    const task = await findOne<TaskRow>('tasks', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'owner_id', operator: '=', value: ownerId },
    ])
    if (!task) {
      res.status(404).json({ error: t('task.notFound', {}, { defaultValue: 'Task not found' }) })
      return
    }
    res.json(await enrichOne(ownerId, task))
  } catch (err) {
    console.error(`GET /tasks/:id failed:`, err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Enforce the per-tier task cap (tiers.ts maxTasks) — defined + advertised in Pricing but enforceLimit
// was never called anywhere, so any tier could create unlimited tasks.
const enforceTaskLimit = enforceLimit<ToDoListLimits>({
  limitType: 'maxTasks',
  getLimit: (limits) => limits.maxTasks,
  getCurrent: async (userId) =>
    count('tasks', [{ field: 'owner_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post('/', enforceTaskLimit, async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const parsed = taskCreateSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      issues: parsed.error.issues,
    })
    return
  }
  try {
    const result = await create<TaskRow>('tasks', {
      title: parsed.data.title,
      description: parsed.data.description ?? '',
      project_id: parsed.data.project_id ?? null,
      parent_id: parsed.data.parent_id ?? null,
      priority: parsed.data.priority ?? 4,
      due_date: parsed.data.due_date ?? null,
      due_time: parsed.data.due_time ?? null,
      recurrence_rule: parsed.data.recurrence_rule ?? null,
      position: parsed.data.position ?? 0,
      is_completed: false,
      owner_id: ownerId,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(await enrichOne(ownerId, result.data as TaskRow))
  } catch (err) {
    console.error('POST /tasks failed:', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.patch('/:id', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  const body = taskUpdateSchema.safeParse(req.body)
  if (!id.success || !body.success) {
    res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      issues: !id.success ? id.error.issues : !body.success ? body.error.issues : [],
    })
    return
  }
  try {
    const owned = await findOne<TaskRow>('tasks', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'owner_id', operator: '=', value: ownerId },
    ])
    if (!owned) {
      res.status(404).json({ error: t('task.notFound', {}, { defaultValue: 'Task not found' }) })
      return
    }
    const result = await updateById<TaskRow>('tasks', id.data.id, {
      ...body.data,
      updated_at: new Date(),
    })
    res.json(await enrichOne(ownerId, result.data as TaskRow))
  } catch (err) {
    console.error(`PATCH /tasks/:id failed:`, err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/:id/complete', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    res
      .status(400)
      .json({ error: t('validation.failed', {}, { defaultValue: 'Validation failed' }) })
    return
  }
  try {
    const task = await findOne<TaskRow>('tasks', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'owner_id', operator: '=', value: ownerId },
    ])
    if (!task) {
      res.status(404).json({ error: t('task.notFound', {}, { defaultValue: 'Task not found' }) })
      return
    }

    // Toggle: if already completed, un-complete (no recurrence spawn).
    if (task.is_completed) {
      const updated = await updateById<TaskRow>('tasks', task.id, {
        is_completed: false,
        completed_at: null,
        updated_at: new Date(),
      })
      res.json({
        completed: false,
        task: await enrichOne(ownerId, updated.data as TaskRow),
      })
      return
    }

    const updated = await updateById<TaskRow>('tasks', task.id, {
      is_completed: true,
      completed_at: new Date(),
      updated_at: new Date(),
    })

    if (task.recurrence_rule) {
      const nextDue = calculateNextDue(task.recurrence_rule, toDateString(task.due_date))
      await create<TaskRow>('tasks', {
        owner_id: task.owner_id,
        project_id: task.project_id,
        parent_id: task.parent_id,
        title: task.title,
        description: task.description ?? '',
        priority: task.priority,
        due_date: nextDue,
        due_time: task.due_time,
        recurrence_rule: task.recurrence_rule,
        position: task.position,
        is_completed: false,
        completed_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      })
    }

    res.json({
      completed: true,
      task: await enrichOne(ownerId, updated.data as TaskRow),
    })
  } catch (err) {
    console.error(`POST /tasks/:id/complete failed:`, err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    res
      .status(400)
      .json({ error: t('validation.failed', {}, { defaultValue: 'Validation failed' }) })
    return
  }
  try {
    const owned = await findOne<TaskRow>('tasks', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'owner_id', operator: '=', value: ownerId },
    ])
    if (!owned) {
      res.status(404).json({ error: t('task.notFound', {}, { defaultValue: 'Task not found' }) })
      return
    }
    await deleteById('tasks', id.data.id)
    res.status(204).end()
  } catch (err) {
    console.error(`DELETE /tasks/:id failed:`, err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Parses simple recurrence rules: "every N (day|week|month|year)s?".
// Falls back to a one-day delta on unrecognised rules so the next instance
// always lands somewhere sensible rather than vanishing.
function calculateNextDue(rule: string, currentDue: string | null): string {
  const base = currentDue ? new Date(currentDue) : new Date()
  const match = rule.match(/^every\s+(\d+)\s+(day|week|month|year)s?$/i)
  if (!match) {
    base.setDate(base.getDate() + 1)
    return base.toISOString().split('T')[0]
  }
  const amount = parseInt(match[1], 10)
  const unit = match[2].toLowerCase()
  if (unit === 'day') base.setDate(base.getDate() + amount)
  else if (unit === 'week') base.setDate(base.getDate() + amount * 7)
  else if (unit === 'month') base.setMonth(base.getMonth() + amount)
  else if (unit === 'year') base.setFullYear(base.getFullYear() + amount)
  return base.toISOString().split('T')[0]
}

export default router
