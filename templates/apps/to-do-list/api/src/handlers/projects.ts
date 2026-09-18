/**
 * Project handlers — owner-scoped project CRUD.
 *
 * Uses @molecule/api-database DataStore (no raw SQL). Deleting a project
 * moves its tasks back to inbox (project_id = null) before deletion. All
 * lookups scope by owner_id = session.userId.
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
  updateMany,
} from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import type { ToDoListLimits } from '../tiers.js'

const router = Router()

const projectCreateSchema = z.object({
  name: z.string().min(1).max(255),
  color: z.string().max(7).optional(),
  icon: z.string().max(64).nullable().optional(),
  parent_id: z.string().uuid().nullable().optional(),
  position: z.number().optional(),
  is_favorite: z.boolean().optional(),
})

const projectUpdateSchema = projectCreateSchema.partial().extend({
  is_archived: z.boolean().optional(),
})

const idParam = z.object({ id: z.string().uuid() })

interface ProjectRow {
  id: string
  owner_id: string
  name: string
  color: string
  icon: string | null
  parent_id: string | null
  position: number
  is_favorite: boolean
  is_archived: boolean
  created_at: string
  updated_at: string
}

router.get('/', async (_req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  try {
    const items = await findMany<ProjectRow>('projects', {
      where: [{ field: 'owner_id', operator: '=', value: ownerId }],
      orderBy: [{ field: 'position', direction: 'asc' }],
    })
    if (items.length === 0) {
      res.json([])
      return
    }
    // Enrich every project row with task counts so the sidebar / triad
    // can render usage without N round-trips. PostgreSQL `numeric` for
    // position deserialises as a string, so coerce to number here too.
    const tasks = await findMany<{ project_id: string | null; is_completed: boolean }>('tasks', {
      where: [{ field: 'owner_id', operator: '=', value: ownerId }],
    })
    const counts = new Map<string, { total: number; completed: number }>()
    for (const t of tasks) {
      if (!t.project_id) continue
      const c = counts.get(t.project_id) ?? { total: 0, completed: 0 }
      c.total += 1
      if (t.is_completed) c.completed += 1
      counts.set(t.project_id, c)
    }
    res.json(
      items.map((p) => ({
        ...p,
        position: typeof p.position === 'number' ? p.position : Number(p.position ?? 0),
        task_count: counts.get(p.id)?.total ?? 0,
        completed_count: counts.get(p.id)?.completed ?? 0,
      })),
    )
  } catch (err) {
    console.error('GET /projects failed:', err)
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
    const project = await findOne<ProjectRow>('projects', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'owner_id', operator: '=', value: ownerId },
    ])
    if (!project) {
      res
        .status(404)
        .json({ error: t('project.notFound', {}, { defaultValue: 'Project not found' }) })
      return
    }
    res.json({
      ...project,
      position:
        typeof project.position === 'number' ? project.position : Number(project.position ?? 0),
      sections: [],
    })
  } catch (err) {
    console.error('GET /projects/:id failed:', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Enforce the per-tier project cap (tiers.ts maxProjects) — defined + advertised but never enforced.
const enforceProjectLimit = enforceLimit<ToDoListLimits>({
  limitType: 'maxProjects',
  getLimit: (limits) => limits.maxProjects,
  getCurrent: async (userId) =>
    count('projects', [{ field: 'owner_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post('/', enforceProjectLimit, async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const parsed = projectCreateSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      issues: parsed.error.issues,
    })
    return
  }
  try {
    const result = await create<ProjectRow>('projects', {
      name: parsed.data.name,
      color: parsed.data.color ?? '#808080',
      icon: parsed.data.icon ?? null,
      parent_id: parsed.data.parent_id ?? null,
      position: parsed.data.position ?? 0,
      is_favorite: parsed.data.is_favorite ?? false,
      is_archived: false,
      owner_id: ownerId,
      created_at: new Date(),
      updated_at: new Date(),
    })
    const proj = result.data as ProjectRow
    res.status(201).json({
      ...proj,
      position: typeof proj.position === 'number' ? proj.position : Number(proj.position ?? 0),
      task_count: 0,
      completed_count: 0,
    })
  } catch (err) {
    console.error('POST /projects failed:', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.patch('/:id', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  const body = projectUpdateSchema.safeParse(req.body)
  if (!id.success || !body.success) {
    res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      issues: !id.success ? id.error.issues : !body.success ? body.error.issues : [],
    })
    return
  }
  try {
    const owned = await findOne<ProjectRow>('projects', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'owner_id', operator: '=', value: ownerId },
    ])
    if (!owned) {
      res
        .status(404)
        .json({ error: t('project.notFound', {}, { defaultValue: 'Project not found' }) })
      return
    }
    const result = await updateById<ProjectRow>('projects', id.data.id, {
      ...body.data,
      updated_at: new Date(),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('projects.update', error)
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
    const owned = await findOne<ProjectRow>('projects', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'owner_id', operator: '=', value: ownerId },
    ])
    if (!owned) {
      res
        .status(404)
        .json({ error: t('project.notFound', {}, { defaultValue: 'Project not found' }) })
      return
    }
    await updateMany(
      'tasks',
      [
        { field: 'project_id', operator: '=', value: id.data.id },
        { field: 'owner_id', operator: '=', value: ownerId },
      ],
      { project_id: null, updated_at: new Date() },
    )
    await deleteById('projects', id.data.id)
    res.status(204).end()
  } catch (error) {
    logger.error('projects.delete', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
