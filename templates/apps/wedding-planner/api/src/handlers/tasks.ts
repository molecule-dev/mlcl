/**
 * Timeline checklist — tasks with due dates and a done flag.
 *
 * GET    /           the caller's tasks (incomplete first, then by due date)
 * POST   /           add a task
 * PUT    /:id        edit a task (incl. `done`)
 * PUT    /:id/toggle flip the done flag (the checkbox fast-path)
 * DELETE /:id        remove a task
 *
 * @module
 */
import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateParams } from '@molecule/api-middleware-validation'

import { findWeddingForUser } from './_seed.js'

const router = Router()

const createTaskSchema = z.object({
  title: z.string().min(1).max(300),
  category: z.string().max(60).optional(),
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'due_date must be YYYY-MM-DD')
    .optional()
    .nullable(),
  done: z.boolean().optional(),
})

const updateTaskSchema = createTaskSchema.partial()

interface TaskRow {
  id: string
  title: string
  category: string
  due_date: string | null
  done: boolean
}

/**
 * Postgres parses DATE columns into JS Date objects pinned to LOCAL midnight;
 * JSON-serializing those yields the previous day in UTC ("2027-01-15" →
 * "2027-01-14T22:00:00.000Z" under UTC+2). The client treats due_date as a
 * plain YYYY-MM-DD calendar date (its formatter appends `T00:00:00Z`), so a
 * full ISO timestamp makes dates render as "—" and overdue flags vanish.
 * Normalize every read-back to the date-only string, whatever the driver
 * returned (pg Date objects, sqlite strings).
 */
function toDateString(value: unknown): string | null {
  if (value == null) return null
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear()
    const m = String(value.getMonth() + 1).padStart(2, '0')
    const d = String(value.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  const s = String(value)
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : s
}

function serializeTask<T extends { due_date?: unknown }>(task: T): T & { due_date: string | null } {
  return { ...task, due_date: toDateString(task.due_date) }
}

async function listTasks(userId: string): Promise<TaskRow[]> {
  const rows = await findMany<TaskRow>('tasks', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [
      { field: 'done', direction: 'asc' },
      { field: 'due_date', direction: 'asc' },
    ],
    limit: 300,
  })
  return rows.map(serializeTask)
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const tasks = await listTasks(userId)
    const total = tasks.length
    const done = tasks.filter((task) => Boolean(task.done)).length
    res.json({ tasks, total, done })
  } catch (err) {
    logger.error('tasks GET failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/', validateBody(createTaskSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const wedding = await findWeddingForUser(userId)
    if (!wedding) {
      return res
        .status(404)
        .json({ error: t('wedding.notFound', {}, { defaultValue: 'Wedding not found' }) })
    }
    const result = await create('tasks', {
      ...req.body,
      user_id: userId,
      wedding_id: String(wedding.id),
      category: req.body.category ?? 'planning',
      due_date: req.body.due_date ?? null,
      done: req.body.done ?? false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    res.status(201).json(result.data)
  } catch (err) {
    logger.error('tasks POST failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

async function ownedTask(userId: string, id: string): Promise<Record<string, unknown> | null> {
  const task = await findById<Record<string, unknown>>('tasks', id)
  if (!task || String(task.user_id) !== userId) return null
  return task
}

router.put(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateTaskSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        return res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      }
      const id = getParamId(req)
      if (!(await ownedTask(userId, id))) {
        return res
          .status(404)
          .json({ error: t('tasks.notFound', {}, { defaultValue: 'Task not found' }) })
      }
      const result = await updateById('tasks', id, {
        ...req.body,
        updated_at: new Date().toISOString(),
      })
      res.json(result.data)
    } catch (err) {
      logger.error('tasks PUT :id failed', err)
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

router.put('/:id/toggle', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = getParamId(req)
    const task = await ownedTask(userId, id)
    if (!task) {
      return res
        .status(404)
        .json({ error: t('tasks.notFound', {}, { defaultValue: 'Task not found' }) })
    }
    const result = await updateById('tasks', id, {
      done: !task.done,
      updated_at: new Date().toISOString(),
    })
    res.json(result.data)
  } catch (err) {
    logger.error('tasks PUT :id/toggle failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.delete('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = getParamId(req)
    if (!(await ownedTask(userId, id))) {
      return res
        .status(404)
        .json({ error: t('tasks.notFound', {}, { defaultValue: 'Task not found' }) })
    }
    await deleteById('tasks', id)
    res.status(204).end()
  } catch (err) {
    logger.error('tasks DELETE :id failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
