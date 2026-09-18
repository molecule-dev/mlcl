import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import { ensureStudentPortalSeeded } from './_seed.js'

const router = Router()

const ASSIGNMENT_STATUSES = ['upcoming', 'submitted', 'overdue', 'graded'] as const

const createAssignmentSchema = z.object({
  course_id: z.string().min(1).optional(),
  course_name: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  due_date: z.string().optional(),
  points: z.number().min(0).optional(),
  status: z.enum(ASSIGNMENT_STATUSES).optional(),
})

const updateAssignmentSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  due_date: z.string().optional(),
  points: z.number().min(0).optional(),
  status: z.enum(ASSIGNMENT_STATUSES).optional(),
  submitted_at: z.string().optional(),
})

router.get('/', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized.' }) })
  }
  await ensureStudentPortalSeeded(userId)
  const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
  if (req.query.status) {
    where.push({ field: 'status', operator: '=', value: String(req.query.status) })
  }
  if (req.query.course_id) {
    where.push({ field: 'course_id', operator: '=', value: String(req.query.course_id) })
  }
  const orderBy: OrderBy[] = [{ field: 'due_date', direction: 'asc' }]
  const assignments = await findMany('assignments', { where, orderBy })
  res.json(assignments)
})

router.post('/', validateBody(createAssignmentSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized.' }) })
  }
  const result = await create('assignments', {
    ...req.body,
    user_id: userId,
    due_date: req.body.due_date ? new Date(req.body.due_date) : null,
    status: req.body.status ?? 'upcoming',
    created_at: new Date(),
  })
  res.status(201).json(result.data)
})

router.get('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized.' }) })
  }
  const id = getParamId(req)
  const assignment = await findById<Record<string, unknown>>('assignments', id)
  if (!assignment || assignment.user_id !== userId) {
    return res.status(404).json({
      error: t('assignments.notFound', undefined, { defaultValue: 'Assignment not found.' }),
    })
  }
  res.json(assignment)
})

router.put('/:id', validateBody(updateAssignmentSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized.' }) })
  }
  const id = getParamId(req)
  const existing = await findById<Record<string, unknown>>('assignments', id)
  if (!existing || existing.user_id !== userId) {
    return res.status(404).json({
      error: t('assignments.notFound', undefined, { defaultValue: 'Assignment not found.' }),
    })
  }
  const updates: Record<string, unknown> = {}
  if (req.body.title !== undefined) updates.title = req.body.title
  if (req.body.description !== undefined) updates.description = req.body.description
  if (req.body.due_date !== undefined) updates.due_date = new Date(req.body.due_date)
  if (req.body.points !== undefined) updates.points = req.body.points
  if (req.body.status !== undefined) updates.status = req.body.status
  if (req.body.submitted_at !== undefined) {
    updates.submitted_at = new Date(req.body.submitted_at)
  }
  const result = await updateById('assignments', id, updates)
  res.json(result.data)
})

router.post('/:id/submit', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized.' }) })
  }
  const id = getParamId(req)
  const existing = await findById<Record<string, unknown>>('assignments', id)
  if (!existing || existing.user_id !== userId) {
    return res.status(404).json({
      error: t('assignments.notFound', undefined, { defaultValue: 'Assignment not found.' }),
    })
  }
  const result = await updateById('assignments', id, {
    status: 'submitted',
    submitted_at: new Date(),
  })
  res.json(result.data)
})

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized.' }) })
  }
  const id = getParamId(req)
  const existing = await findById<Record<string, unknown>>('assignments', id)
  if (!existing || existing.user_id !== userId) {
    return res.status(404).json({
      error: t('assignments.notFound', undefined, { defaultValue: 'Assignment not found.' }),
    })
  }
  await deleteById('assignments', id)
  res.status(204).end()
})

export default router
