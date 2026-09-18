/**
 * Exercise CRUD handlers.
 *
 * - System exercises (`is_custom=false`) are publicly readable; custom
 *   exercises are owner-scoped.
 * - Mutations on system exercises are forbidden — only owner-scoped writes.
 * - Inputs validated via @molecule/api-middleware-validation (zod).
 * - DataStore (no raw SQL) via @molecule/api-database.
 *
 * @module
 */

import { randomUUID } from 'node:crypto'

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId, uuidParamSchema as idParamSchema } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { create, deleteMany, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody, validateParams, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const listQuerySchema = z.object({
  q: z.string().max(120).optional(),
  muscle_group: z.string().max(64).optional(),
  equipment: z.string().max(64).optional(),
  category: z.string().max(64).optional(),
  custom_only: z.enum(['true', 'false']).optional(),
  sort_by: z.enum(['name', 'created_at']).optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  offset: z.coerce.number().int().min(0).optional(),
})

const createExerciseSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  instructions: z.string().max(5000).optional(),
  muscle_group: z.string().max(64).optional(),
  muscle_groups: z.array(z.string().max(64)).max(20).optional(),
  equipment: z.string().max(64).optional(),
  category: z.string().max(64).optional(),
  difficulty: z.string().max(32).optional(),
  // video_s3_key / image_s3_key are intentionally NOT accepted from the client.
  // A client-chosen storage key could address another tenant's object via any
  // future download/preview route (cross-tenant IDOR); both are minted
  // server-side at create time below.
})

const updateExerciseSchema = createExerciseSchema.partial()

router.get(
  '/',
  validateQuery(listQuerySchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const {
      q,
      muscle_group,
      equipment,
      category,
      custom_only,
      sort_by,
      sort_order,
      limit,
      offset,
    } = req.query as z.infer<typeof listQuerySchema>

    const where: WhereCondition[] = []
    if (custom_only === 'true') {
      // Custom exercises authored by this user only.
      where.push({ field: 'user_id', operator: '=', value: userId })
      where.push({ field: 'is_custom', operator: '=', value: true })
    } else {
      // The user sees system catalog + their own custom exercises. We
      // can't OR cleanly with WhereCondition[]; do two queries and merge.
      const sys = await findMany('exercises', {
        where: [{ field: 'is_custom', operator: '=', value: false }],
        orderBy: [{ field: sort_by ?? 'name', direction: sort_order ?? 'asc' }],
        limit: limit ?? 200,
        offset: offset ?? 0,
      })
      const own = await findMany('exercises', {
        where: [{ field: 'user_id', operator: '=', value: userId }],
        orderBy: [{ field: sort_by ?? 'name', direction: sort_order ?? 'asc' }],
        limit: limit ?? 200,
        offset: offset ?? 0,
      })
      const merged = filterCatalog([...sys, ...own], { q, muscle_group, equipment, category })
      res.json(merged)
      return
    }
    if (muscle_group) where.push({ field: 'muscle_group', operator: '=', value: muscle_group })
    if (equipment) where.push({ field: 'equipment', operator: '=', value: equipment })
    if (category) where.push({ field: 'category', operator: '=', value: category })

    const orderBy: OrderBy[] = [{ field: sort_by ?? 'name', direction: sort_order ?? 'asc' }]
    const exercises = await findMany('exercises', {
      where,
      orderBy,
      limit: limit ?? 100,
      offset: offset ?? 0,
    })
    const filtered = q ? filterCatalog(exercises, { q }) : exercises
    res.json(filtered)
  },
)

router.get(
  '/:id',
  validateParams(idParamSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const exercise = await findById<Record<string, unknown>>('exercises', String(req.params.id))
    if (!exercise) {
      res.status(404).json({
        error: t('exercise.notFound', undefined, { defaultValue: 'Exercise not found.' }),
      })
      return
    }
    // Custom exercises are owner-only. System exercises are public.
    if (exercise.is_custom === true && exercise.user_id !== userId) {
      res.status(404).json({
        error: t('exercise.notFound', undefined, { defaultValue: 'Exercise not found.' }),
      })
      return
    }
    res.json(exercise)
  },
)

router.post(
  '/',
  validateBody(createExerciseSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const body = req.body as z.infer<typeof createExerciseSchema>
    const result = await create('exercises', {
      user_id: userId,
      name: body.name,
      description: body.description ?? null,
      instructions: body.instructions ?? null,
      muscle_group: body.muscle_group ?? null,
      muscle_groups: JSON.stringify(body.muscle_groups ?? []),
      equipment: body.equipment ?? null,
      category: body.category ?? null,
      difficulty: body.difficulty ?? null,
      // Server-minted, owner-scoped keys — never client-supplied values.
      video_s3_key: `exercises/${userId}/${randomUUID()}/video`,
      image_s3_key: `exercises/${userId}/${randomUUID()}/image`,
      is_custom: true,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(result.data)
  },
)

router.patch(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateExerciseSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = String(req.params.id)
    const existing = await findById<Record<string, unknown>>('exercises', id)
    // Mutations only allowed on the owner's custom exercises.
    if (!existing || existing.is_custom !== true || existing.user_id !== userId) {
      res.status(404).json({
        error: t('exercise.notFound', undefined, { defaultValue: 'Exercise not found.' }),
      })
      return
    }
    const incoming = { ...(req.body as Record<string, unknown>) }
    if (incoming.muscle_groups !== undefined) {
      incoming.muscle_groups = JSON.stringify(incoming.muscle_groups)
    }
    const result = await updateById('exercises', id, { ...incoming, updated_at: new Date() })
    res.json(result.data)
  },
)

router.delete(
  '/:id',
  validateParams(idParamSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = String(req.params.id)
    const existing = await findById<Record<string, unknown>>('exercises', id)
    if (!existing || existing.is_custom !== true || existing.user_id !== userId) {
      res.status(404).json({
        error: t('exercise.notFound', undefined, { defaultValue: 'Exercise not found.' }),
      })
      return
    }
    await deleteMany('exercises', [
      { field: 'id', operator: '=', value: id },
      { field: 'user_id', operator: '=', value: userId },
    ])
    res.status(204).end()
  },
)

interface CatalogFilter {
  q?: string
  muscle_group?: string
  equipment?: string
  category?: string
}

function filterCatalog(
  rows: Array<Record<string, unknown>>,
  f: CatalogFilter,
): Array<Record<string, unknown>> {
  return rows.filter((row) => {
    if (f.muscle_group && String(row.muscle_group ?? '') !== f.muscle_group) return false
    if (f.equipment && String(row.equipment ?? '') !== f.equipment) return false
    if (f.category && String(row.category ?? '') !== f.category) return false
    if (f.q) {
      const haystack = `${String(row.name ?? '')} ${String(row.description ?? '')}`.toLowerCase()
      if (!haystack.includes(f.q.toLowerCase())) return false
    }
    return true
  })
}

export default router
