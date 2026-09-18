import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import {
  count,
  create,
  deleteById,
  findById,
  findMany,
  findOne,
  updateById,
} from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import type { WikiLimits } from '../tiers.js'

const router = Router()

const getParam = (req: Request, key: string): string => {
  const v = req.params[key]
  return Array.isArray(v) ? String(v[0]) : String(v ?? '')
}

const slugify = (input: string): string =>
  input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const createSpaceSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  icon: z.string().max(64).optional(),
  color: z.string().max(32).optional(),
  visibility: z.enum(['private', 'public']).optional(),
  is_public: z.boolean().optional(),
})

const updateSpaceSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(2000).optional(),
  icon: z.string().max(64).optional(),
  color: z.string().max(32).optional(),
  visibility: z.enum(['private', 'public']).optional(),
  is_public: z.boolean().optional(),
})

/** Live count of a space's non-trashed pages (the page_count column is a stale denormalized cache). */
const spacePageCount = (spaceId: unknown): Promise<number> =>
  count('wiki_pages', [
    { field: 'space_id', operator: '=', value: spaceId },
    { field: 'trashed_at', operator: 'is_null', value: null },
  ])

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })

    const spaces = await findMany<Record<string, unknown>>('wiki_spaces', {
      where: [{ field: 'owner_id', operator: '=', value: userId }],
      orderBy: [{ field: 'name', direction: 'asc' }],
    })
    // page_count is a denormalized column that was never maintained (always 0) — derive the live
    // non-trashed page count per space so the space cards show the real number.
    const withCounts = await Promise.all(
      spaces.map(async (space) => ({ ...space, page_count: await spacePageCount(space.id) })),
    )
    res.json(withCounts)
  } catch (err) {
    console.error('[spaces.get /]', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })

    const id = getParam(req, 'id')
    const space = await findById<Record<string, unknown>>('wiki_spaces', id)
    if (!space) {
      return res
        .status(404)
        .json({ error: t('spaces.notFound', {}, { defaultValue: 'Space not found' }) })
    }

    const isOwner = space.owner_id === userId
    const isPublic = space.is_public === true || space.visibility === 'public'
    if (!isOwner && !isPublic) {
      const member = await findOne('wiki_space_members', [
        { field: 'space_id', operator: '=', value: id },
        { field: 'user_id', operator: '=', value: userId },
      ])
      if (!member) {
        return res
          .status(404)
          .json({ error: t('spaces.notFound', {}, { defaultValue: 'Space not found' }) })
      }
    }

    res.json({ ...space, page_count: await spacePageCount(id) })
  } catch (err) {
    console.error('[spaces.get /:id]', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Enforce the per-tier space cap (tiers.ts maxSpaces) — defined + shown on Pricing but enforceLimit
// was never called, so any tier could create unlimited spaces. Spaces are owned by owner_id.
const enforceSpaceLimit = enforceLimit<WikiLimits>({
  limitType: 'maxSpaces',
  getLimit: (limits) => limits.maxSpaces,
  getCurrent: async (userId) =>
    count('wiki_spaces', [{ field: 'owner_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post(
  '/',
  enforceSpaceLimit,
  validateBody(createSpaceSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId)
        return res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })

      const { name, description, icon, color, visibility, is_public } = req.body as z.infer<
        typeof createSpaceSchema
      >
      const baseSlug = slugify(name)
      let slug = baseSlug || `space-${Date.now()}`
      // Ensure uniqueness across the global slug space.
      let suffix = 1
      while (await findOne('wiki_spaces', [{ field: 'slug', operator: '=', value: slug }])) {
        slug = `${baseSlug}-${suffix++}`
      }

      const result = await create('wiki_spaces', {
        owner_id: userId,
        name,
        slug,
        description: description ?? null,
        icon: icon ?? 'book',
        color: color ?? null,
        visibility: visibility ?? 'private',
        is_public: is_public ?? false,
        page_count: 0,
        created_at: new Date(),
      })
      res.status(201).json(result.data)
    } catch (err) {
      console.error('[spaces.post /]', err)
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

router.put('/:id', validateBody(updateSpaceSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })

    const id = getParam(req, 'id')
    const existing = await findById<Record<string, unknown>>('wiki_spaces', id)
    if (!existing || existing.owner_id !== userId) {
      return res
        .status(404)
        .json({ error: t('spaces.notFound', {}, { defaultValue: 'Space not found' }) })
    }

    const updates: Record<string, unknown> = { ...(req.body as Record<string, unknown>) }
    if (typeof updates.name === 'string') {
      updates.slug = slugify(updates.name)
    }
    const result = await updateById('wiki_spaces', id, updates)
    res.json(result.data)
  } catch (err) {
    console.error('[spaces.put /:id]', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })

    const id = getParam(req, 'id')
    const existing = await findById<Record<string, unknown>>('wiki_spaces', id)
    if (!existing || existing.owner_id !== userId) {
      return res
        .status(404)
        .json({ error: t('spaces.notFound', {}, { defaultValue: 'Space not found' }) })
    }
    await deleteById('wiki_spaces', id)
    res.status(204).end()
  } catch (err) {
    console.error('[spaces.delete /:id]', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id/members', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })

    const id = getParam(req, 'id')
    const space = await findById<Record<string, unknown>>('wiki_spaces', id)
    if (!space) {
      return res
        .status(404)
        .json({ error: t('spaces.notFound', {}, { defaultValue: 'Space not found' }) })
    }
    if (space.owner_id !== userId) {
      const member = await findOne('wiki_space_members', [
        { field: 'space_id', operator: '=', value: id },
        { field: 'user_id', operator: '=', value: userId },
      ])
      if (!member) {
        return res
          .status(404)
          .json({ error: t('spaces.notFound', {}, { defaultValue: 'Space not found' }) })
      }
    }
    const members = await findMany('wiki_space_members', {
      where: [{ field: 'space_id', operator: '=', value: id }],
    })
    res.json(members)
  } catch (err) {
    console.error('[spaces.get /:id/members]', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

const inviteSchema = z.object({
  user_id: z.string().min(1),
  role: z.enum(['viewer', 'editor', 'admin']).optional(),
})

router.post('/:id/members', validateBody(inviteSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })

    const id = getParam(req, 'id')
    const space = await findById<Record<string, unknown>>('wiki_spaces', id)
    if (!space || space.owner_id !== userId) {
      return res
        .status(404)
        .json({ error: t('spaces.notFound', {}, { defaultValue: 'Space not found' }) })
    }

    const { user_id, role } = req.body as z.infer<typeof inviteSchema>
    const existing = await findOne('wiki_space_members', [
      { field: 'space_id', operator: '=', value: id },
      { field: 'user_id', operator: '=', value: user_id },
    ])
    if (existing) {
      return res
        .status(409)
        .json({ error: t('spaces.memberExists', {}, { defaultValue: 'Member already invited' }) })
    }
    const result = await create('wiki_space_members', {
      space_id: id,
      user_id,
      role: role ?? 'viewer',
      invited_by: userId,
      accepted_at: new Date(),
      created_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (err) {
    console.error('[spaces.post /:id/members]', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Convenience: count of pages in a space (used by the limit gate elsewhere).
router.get('/:id/page-count', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })

    const id = getParam(req, 'id')
    const space = await findById<Record<string, unknown>>('wiki_spaces', id)
    if (!space || space.owner_id !== userId) {
      return res
        .status(404)
        .json({ error: t('spaces.notFound', {}, { defaultValue: 'Space not found' }) })
    }
    const total = await count('wiki_pages', [{ field: 'space_id', operator: '=', value: id }])
    res.json({ count: total })
  } catch (err) {
    console.error('[spaces.get /:id/page-count]', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
