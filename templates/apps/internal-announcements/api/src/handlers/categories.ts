/**
 * Category handlers — admin-only CRUD over `announcement_categories`.
 *
 * In v1 every authenticated user may create, edit, and delete categories
 * they themselves created. Cross-user category mutation is blocked by the
 * `requireOwnedCategory` walk; reads are visible to all authenticated users.
 */

import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { count, create, deleteById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import {
  type AnnouncementCategoryRow,
  internalError,
  requireOwnedCategory,
  requireUser,
  validationError,
} from '../lib/authz.js'
import type { InternalAnnouncementsLimits } from '../tiers.js'

const router = Router()

const idParam = z.object({ id: z.string().uuid() })

const createSchema = z.object({
  name: z.string().min(1).max(120),
  color: z.string().min(1).max(16).optional(),
  icon: z.string().max(64).nullable().optional(),
})

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  color: z.string().min(1).max(16).nullable().optional(),
  icon: z.string().max(64).nullable().optional(),
})

/**
 * Default channels seeded the first time a user lists categories on a
 * fresh workspace. Keeps the Composer / Feed channel-chip UI populated
 * out of the box; users may rename, delete, or add to these freely.
 */
// Channel colors render both as small chip TEXT on light surfaces (#f1f5f9)
// and as chip BACKGROUNDS under white text, so each must clear 4.5:1 both
// ways. product/culture/remote/security were one shade too light (2.2-4.4:1,
// axe serious on /feed) — each stepped to the same hue one shade darker.
// Keep in sync with DEFAULT_CATEGORY_COLORS in app/src/lib/announcements.ts.
const DEFAULT_CHANNELS: Array<{ name: string; color: string; icon: string }> = [
  { name: 'company', color: '#4f46e5', icon: 'apartment' },
  { name: 'product', color: '#0e7490', icon: 'lightbulb' }, // was #06b6d4 (2.21:1); cyan-700
  { name: 'security', color: '#b91c1c', icon: 'shield' }, // was #dc2626 (4.4:1); red-700
  { name: 'people', color: '#7c3aed', icon: 'volunteer_activism' },
  { name: 'culture', color: '#b45309', icon: 'celebration' }, // was #d97706 (2.9:1); amber-700
  { name: 'remote', color: '#047857', icon: 'home_work' }, // was #059669 (3.43:1); emerald-700
]

router.get('/', async (_req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  try {
    let categories = await findMany<AnnouncementCategoryRow>('announcement_categories', {
      orderBy: [{ field: 'name', direction: 'asc' }],
    })
    if (categories.length === 0) {
      // Seed defaults — best-effort, ignore unique conflicts if a parallel
      // request seeded first.
      for (const c of DEFAULT_CHANNELS) {
        try {
          await create<AnnouncementCategoryRow>('announcement_categories', {
            name: c.name,
            color: c.color,
            icon: c.icon,
            created_by: ownerId,
            created_at: new Date(),
            updated_at: new Date(),
          })
        } catch (_error) {
          // ignore — another request likely seeded the same row (unique conflict)
        }
      }
      categories = await findMany<AnnouncementCategoryRow>('announcement_categories', {
        orderBy: [{ field: 'name', direction: 'asc' }],
      })
    }
    res.json(categories)
  } catch (error) {
    logger.error('categories.list', error)
    internalError(res)
  }
})

// Enforce the per-tier category cap (tiers.ts maxCategories) — defined + advertised in Pricing but
// enforceLimit was never called on this create path.
const enforceCategoryLimit = enforceLimit<InternalAnnouncementsLimits>({
  limitType: 'maxCategories',
  getLimit: (limits) => limits.maxCategories,
  getCurrent: async (userId) =>
    count('announcement_categories', [{ field: 'created_by', operator: '=', value: userId }]),
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
    const result = await create<AnnouncementCategoryRow>('announcement_categories', {
      name: parsed.data.name,
      color: parsed.data.color ?? '#0088cc',
      icon: parsed.data.icon ?? null,
      created_by: ownerId,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('categories.create', error)
    internalError(res)
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
    const owned = await requireOwnedCategory(id.data.id, ownerId)
    if (!owned) {
      res.status(404).json({
        error: t('categories.notFound', {}, { defaultValue: 'Category not found' }),
      })
      return
    }
    const result = await updateById<AnnouncementCategoryRow>(
      'announcement_categories',
      id.data.id,
      {
        ...body.data,
        updated_at: new Date(),
      },
    )
    res.json(result.data)
  } catch (error) {
    logger.error('categories.patch', error)
    internalError(res)
  }
})

router.put('/:id', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  const body = updateSchema.safeParse(req.body)
  if (!id.success || !body.success) {
    validationError(res, id.success ? body.error?.issues : id.error.issues)
    return
  }
  try {
    const owned = await requireOwnedCategory(id.data.id, ownerId)
    if (!owned) {
      res.status(404).json({
        error: t('categories.notFound', {}, { defaultValue: 'Category not found' }),
      })
      return
    }
    const result = await updateById<AnnouncementCategoryRow>(
      'announcement_categories',
      id.data.id,
      {
        ...body.data,
        updated_at: new Date(),
      },
    )
    res.json(result.data)
  } catch (error) {
    logger.error('categories.put', error)
    internalError(res)
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
    const owned = await requireOwnedCategory(id.data.id, ownerId)
    if (!owned) {
      res.status(404).json({
        error: t('categories.notFound', {}, { defaultValue: 'Category not found' }),
      })
      return
    }
    await deleteById('announcement_categories', id.data.id)
    res.status(204).end()
  } catch (error) {
    logger.error('categories.delete', error)
    internalError(res)
  }
})

export default router
