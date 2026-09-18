/**
 * Page handlers — hierarchical pages within a workspace.
 *
 * Pages form a tree (parent_id self-FK). Authorization always walks
 * back to the owning workspace via `requirePage`. The list endpoint
 * supports both flat (no `parent_id`) and tree (filtered to a parent)
 * views, plus an `include_trashed` toggle for the Trash UI.
 *
 * Search is exposed as `/pages/search?q=...&workspace_id=...`. The
 * implementation uses a per-workspace title scan so the gate doesn't
 * depend on the meilisearch bond actually being reachable in CI.
 */

import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

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

import {
  internalError,
  type PageRow,
  requirePage,
  requireUser,
  requireWorkspace,
  validationError,
} from '../lib/authz.js'
import type { NoteTakingLimits } from '../tiers.js'

const router = Router()

const idParam = z.object({ id: z.string().uuid() })

const listSchema = z.object({
  workspace_id: z.string().uuid(),
  parent_id: z.string().uuid().nullable().optional(),
  include_trashed: z.string().optional(),
})

const searchSchema = z.object({
  workspace_id: z.string().uuid(),
  q: z.string().min(1).max(255),
})

const createSchema = z.object({
  workspace_id: z.string().uuid(),
  parent_id: z.string().uuid().nullable().optional(),
  template_id: z.string().uuid().nullable().optional(),
  title: z.string().max(1000).optional(),
  icon: z.string().max(64).nullable().optional(),
  cover_image: z.string().max(1024).nullable().optional(),
  is_template: z.boolean().optional(),
})

const updateSchema = z.object({
  title: z.string().max(1000).optional(),
  icon: z.string().max(64).nullable().optional(),
  cover_image: z.string().max(1024).nullable().optional(),
  is_favorited: z.boolean().optional(),
  is_template: z.boolean().optional(),
})

const moveSchema = z.object({
  parent_id: z.string().uuid().nullable().optional(),
  position: z.number(),
})

router.get('/', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const parsed = listSchema.safeParse(req.query)
  if (!parsed.success) {
    validationError(res, parsed.error.issues)
    return
  }
  try {
    const ws = await requireWorkspace(parsed.data.workspace_id, ownerId)
    if (!ws) {
      // Don't leak workspace existence — return empty list.
      res.json([])
      return
    }
    const where: WhereCondition[] = [
      { field: 'workspace_id', operator: '=', value: parsed.data.workspace_id },
    ]
    if (parsed.data.parent_id === null || parsed.data.parent_id === undefined) {
      where.push({ field: 'parent_id', operator: 'is_null' })
    } else {
      where.push({ field: 'parent_id', operator: '=', value: parsed.data.parent_id })
    }
    if (parsed.data.include_trashed !== 'true') {
      where.push({ field: 'trashed_at', operator: 'is_null' })
    }
    const items = await findMany<PageRow>('pages', {
      where,
      orderBy: [{ field: 'position', direction: 'asc' }],
    })
    res.json(items)
  } catch (error) {
    internalError(res, error)
  }
})

router.get('/search', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const parsed = searchSchema.safeParse(req.query)
  if (!parsed.success) {
    validationError(res, parsed.error.issues)
    return
  }
  try {
    const ws = await requireWorkspace(parsed.data.workspace_id, ownerId)
    if (!ws) {
      res.json([])
      return
    }
    // The DataStore `like` operator escapes %/_ on most providers, so it
    // can't be used for substring matching. Fall back to an in-memory
    // filter scoped to the owner's workspace — bounded by per-workspace
    // page count which is small per user.
    const owned = await findMany<PageRow>('pages', {
      where: [
        { field: 'workspace_id', operator: '=', value: parsed.data.workspace_id },
        { field: 'trashed_at', operator: 'is_null' },
      ],
      orderBy: [{ field: 'updated_at', direction: 'desc' }],
      limit: 1000,
    })
    const needle = parsed.data.q.toLowerCase()
    const hits = owned.filter((p) => (p.title ?? '').toLowerCase().includes(needle)).slice(0, 50)
    res.json(hits)
  } catch (error) {
    internalError(res, error)
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
    const page = await requirePage(id.data.id, ownerId)
    if (!page) {
      res.status(404).json({ error: t('page.notFound', {}, { defaultValue: 'Page not found' }) })
      return
    }
    const blocks = await findMany('blocks', {
      where: [{ field: 'page_id', operator: '=', value: page.id }],
      orderBy: [{ field: 'position', direction: 'asc' }],
    })
    res.json({ ...page, blocks })
  } catch (error) {
    internalError(res, error)
  }
})

// Enforce the per-tier page cap (tiers.ts maxPages) — defined + shown on Pricing but enforceLimit was
// never called anywhere, so any tier could create unlimited pages.
const enforcePageLimit = enforceLimit<NoteTakingLimits>({
  limitType: 'maxPages',
  getLimit: (limits) => limits.maxPages,
  getCurrent: async (userId) =>
    count('pages', [{ field: 'created_by', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post('/', enforcePageLimit, async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) {
    validationError(res, parsed.error.issues)
    return
  }
  try {
    const ws = await requireWorkspace(parsed.data.workspace_id, ownerId)
    if (!ws) {
      res
        .status(404)
        .json({ error: t('workspace.notFound', {}, { defaultValue: 'Workspace not found' }) })
      return
    }
    if (parsed.data.parent_id) {
      const parent = await requirePage(parsed.data.parent_id, ownerId)
      if (!parent || parent.workspace_id !== ws.id) {
        res.status(404).json({ error: t('page.notFound', {}, { defaultValue: 'Page not found' }) })
        return
      }
    }
    const position = await getNextPosition(ws.id, parsed.data.parent_id ?? null)
    const result = await create<PageRow>('pages', {
      workspace_id: ws.id,
      parent_id: parsed.data.parent_id ?? null,
      template_id: parsed.data.template_id ?? null,
      title: parsed.data.title ?? t('page.untitled', {}, { defaultValue: 'Untitled' }),
      icon: parsed.data.icon ?? null,
      cover_image: parsed.data.cover_image ?? null,
      position,
      is_favorited: false,
      is_template: parsed.data.is_template ?? false,
      trashed_at: null,
      created_by: ownerId,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    internalError(res, error)
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
    const page = await requirePage(id.data.id, ownerId)
    if (!page) {
      res.status(404).json({ error: t('page.notFound', {}, { defaultValue: 'Page not found' }) })
      return
    }
    const result = await updateById<PageRow>('pages', id.data.id, {
      ...body.data,
      updated_at: new Date(),
    })
    res.json(result.data)
  } catch (error) {
    internalError(res, error)
  }
})

router.post('/:id/move', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  const body = moveSchema.safeParse(req.body)
  if (!id.success || !body.success) {
    validationError(res, id.success ? body.error?.issues : id.error.issues)
    return
  }
  try {
    const page = await requirePage(id.data.id, ownerId)
    if (!page) {
      res.status(404).json({ error: t('page.notFound', {}, { defaultValue: 'Page not found' }) })
      return
    }
    if (body.data.parent_id) {
      const parent = await requirePage(body.data.parent_id, ownerId)
      if (!parent || parent.workspace_id !== page.workspace_id) {
        res.status(404).json({ error: t('page.notFound', {}, { defaultValue: 'Page not found' }) })
        return
      }
      // Cycle guard: don't allow re-parenting under self.
      if (parent.id === page.id) {
        res.status(400).json({
          error: t('page.cycleRefused', {}, { defaultValue: 'Cannot move page under itself' }),
        })
        return
      }
    }
    const result = await updateById<PageRow>('pages', id.data.id, {
      parent_id: body.data.parent_id ?? null,
      position: body.data.position,
      updated_at: new Date(),
    })
    res.json(result.data)
  } catch (error) {
    internalError(res, error)
  }
})

router.post('/:id/trash', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    validationError(res, id.error.issues)
    return
  }
  try {
    const page = await requirePage(id.data.id, ownerId)
    if (!page) {
      res.status(404).json({ error: t('page.notFound', {}, { defaultValue: 'Page not found' }) })
      return
    }
    const result = await updateById<PageRow>('pages', id.data.id, {
      trashed_at: new Date(),
      updated_at: new Date(),
    })
    res.json(result.data)
  } catch (error) {
    internalError(res, error)
  }
})

router.post('/:id/restore', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    validationError(res, id.error.issues)
    return
  }
  try {
    const page = await requirePage(id.data.id, ownerId)
    if (!page) {
      res.status(404).json({ error: t('page.notFound', {}, { defaultValue: 'Page not found' }) })
      return
    }
    const result = await updateById<PageRow>('pages', id.data.id, {
      trashed_at: null,
      updated_at: new Date(),
    })
    res.json(result.data)
  } catch (error) {
    internalError(res, error)
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
    const page = await requirePage(id.data.id, ownerId)
    if (!page) {
      res.status(404).json({ error: t('page.notFound', {}, { defaultValue: 'Page not found' }) })
      return
    }
    // CASCADE on the schema cleans up child pages, blocks, databases.
    await deleteById('pages', id.data.id)
    res.status(204).end()
  } catch (error) {
    internalError(res, error)
  }
})

async function getNextPosition(workspaceId: string, parentId: string | null): Promise<number> {
  const where: WhereCondition[] = [{ field: 'workspace_id', operator: '=', value: workspaceId }]
  if (parentId === null) {
    where.push({ field: 'parent_id', operator: 'is_null' })
  } else {
    where.push({ field: 'parent_id', operator: '=', value: parentId })
  }
  const siblings = await findMany<PageRow>('pages', {
    where,
    orderBy: [{ field: 'position', direction: 'desc' }],
    limit: 1,
  })
  return siblings.length > 0 ? siblings[0].position + 1 : 0
}

export default router
