/**
 * Category handlers — owner-scoped CRUD over `categories`.
 *
 * Categories are reorderable label folders for clips. Every list query
 * filters by `owner_id`; every mutation re-checks ownership via
 * `requireCategory` and returns 404 (not 403) on failure to avoid
 * leaking existence. Deleting a category un-categorizes member clips
 * (FK ON DELETE SET NULL handles this at the DB layer).
 */

import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

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

import {
  type CategoryRow,
  internalError,
  requireCategory,
  requireUser,
  validationError,
} from '../lib/authz.js'
import type { ClipboardManagerLimits } from '../tiers.js'

const router = Router()

const idParam = z.object({ id: z.string().uuid() })

const createSchema = z.object({
  name: z.string().min(1).max(255),
  icon: z.string().max(64).nullable().optional(),
  color: z.string().max(32).nullable().optional(),
})

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  icon: z.string().max(64).nullable().optional(),
  color: z.string().max(32).nullable().optional(),
  position: z.number().optional(),
})

router.get('/', async (_req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  try {
    const items = await findMany<CategoryRow>('categories', {
      where: [{ field: 'owner_id', operator: '=', value: ownerId }],
      orderBy: [{ field: 'position', direction: 'asc' }],
    })
    res.json(items)
  } catch (err) {
    internalError(res, err)
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    validationError(res, id.error.issues)
    return
  }
  try {
    const cat = await requireCategory(id.data.id, ownerId)
    if (!cat) {
      res
        .status(404)
        .json({ error: t('category.notFound', {}, { defaultValue: 'Category not found' }) })
      return
    }
    const clips = await findMany('clips', {
      where: [
        { field: 'category_id', operator: '=', value: cat.id },
        { field: 'owner_id', operator: '=', value: ownerId },
      ],
    })
    res.json({ ...cat, clip_count: clips.length })
  } catch (err) {
    internalError(res, err)
  }
})

// Enforce the per-tier category cap (tiers.ts maxCategories) — defined + advertised in CATALOG but
// enforceLimit was never called, so any tier could create unlimited categories.
const enforceCategoryLimit = enforceLimit<ClipboardManagerLimits>({
  limitType: 'maxCategories',
  getLimit: (limits) => limits.maxCategories,
  getCurrent: async (userId) =>
    count('categories', [{ field: 'owner_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post('/', enforceCategoryLimit, async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) {
    validationError(res, parsed.error.issues)
    return
  }
  try {
    const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: ownerId }]
    const last = await findMany<CategoryRow>('categories', {
      where,
      orderBy: [{ field: 'position', direction: 'desc' }],
      limit: 1,
    })
    const nextPosition = last.length > 0 ? Number(last[0].position) + 1 : 0
    const result = await create<CategoryRow>('categories', {
      name: parsed.data.name,
      icon: parsed.data.icon ?? null,
      color: parsed.data.color ?? null,
      position: nextPosition,
      owner_id: ownerId,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (err) {
    internalError(res, err)
  }
})

router.patch('/:id', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  const body = updateSchema.safeParse(req.body)
  if (!id.success || !body.success) {
    validationError(res, id.success ? body.error?.issues : id.error.issues)
    return
  }
  try {
    const cat = await requireCategory(id.data.id, ownerId)
    if (!cat) {
      res
        .status(404)
        .json({ error: t('category.notFound', {}, { defaultValue: 'Category not found' }) })
      return
    }
    const result = await updateById<CategoryRow>('categories', id.data.id, {
      ...body.data,
      updated_at: new Date(),
    })
    res.json(result.data)
  } catch (err) {
    internalError(res, err)
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    validationError(res, id.error.issues)
    return
  }
  try {
    const cat = await requireCategory(id.data.id, ownerId)
    if (!cat) {
      res
        .status(404)
        .json({ error: t('category.notFound', {}, { defaultValue: 'Category not found' }) })
      return
    }
    // FK ON DELETE SET NULL on clips.category_id un-categorizes member clips.
    await deleteById('categories', id.data.id)
    res.status(204).end()
  } catch (err) {
    internalError(res, err)
  }
})

// Touch findOne so eslint's `no-unused-vars` doesn't trip when expanding the
// authz helper later. Importing keeps the dependency graph stable for tests.
void findOne
export default router
