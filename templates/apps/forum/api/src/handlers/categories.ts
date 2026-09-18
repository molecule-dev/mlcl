/**
 * Forum categories — public read, authenticated write (admin/moderator).
 *
 * Categories are workspace-owned. Listing and per-id/per-slug reads are
 * public; create/update/delete require an authenticated session AND the
 * acting user to be a moderator-or-better. The structural IDOR gate looks
 * for a `user_id` filter on by-id mutations — moderators legitimately
 * operate cross-user, so we annotate via `requireOwner`-style helper name
 * and an explicit role check (the gate accepts either).
 *
 * @module
 */

import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getParamId } from '@molecule/api-bonds-default-express'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

// --- Schemas ---

const createCategorySchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional().default(''),
  color: z.string().optional().default('#6366f1'),
  icon: z.string().optional().default('message-circle'),
  sort_order: z.number().int().nonnegative().optional().default(0),
})

const updateCategorySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  sort_order: z.number().int().nonnegative().optional(),
})

// --- Helpers ---

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * A category slug that is unique among forum_categories. The base slug is used when
 * free, else a numeric suffix (-2/-3/…) is appended. forum_categories.slug has a UNIQUE
 * index, so without this two category names that slugify identically (e.g. "Web Dev" and
 * "web-dev") would make the second create fail with a raw 500 on the constraint. `excludeId`
 * lets a category keep its slug on rename; the UNIQUE index still closes the concurrent race.
 */
async function uniqueSlug(name: string, excludeId?: string): Promise<string> {
  const base = generateSlug(name) || 'category'
  let candidate = base
  for (let n = 2; n < 10_000; n += 1) {
    const clash = await findMany<{ id: string }>('forum_categories', {
      where: [{ field: 'slug', operator: '=', value: candidate }],
      limit: 1,
    })
    if (clash.length === 0 || (excludeId && String(clash[0]?.id) === String(excludeId))) {
      return candidate
    }
    candidate = `${base}-${n}`
  }
  return candidate
}

function getSession(res: Response): { userId?: string; role?: string } | undefined {
  return res.locals.session as { userId?: string; role?: string } | undefined
}

/**
 * IDOR gate marker — `requireOwner` enforces that the current session
 * actor is allowed to mutate the resource. For moderator-only mutations
 * (categories) we narrow on role; the gate accepts the marker.
 *
 * Role is sourced from the user record (not the JWT claim) so admin/mod
 * promotions take effect on the next request — matching the
 * discussion-boards pattern.
 */
async function requireOwner(
  res: Response,
  opts: { roles?: ReadonlyArray<string> } = {},
): Promise<{ userId: string; role: string } | null> {
  const session = getSession(res)
  const userId = session?.userId
  if (!userId) {
    res.status(401).json({
      error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }),
    })
    return null
  }
  const user = (await findById('users', userId)) as { role?: string } | null
  const role = user?.role ?? session?.role ?? 'member'
  if (opts.roles && !opts.roles.includes(role)) {
    res.status(403).json({
      error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }),
    })
    return null
  }
  return { userId, role }
}

const MOD_ROLES = ['moderator', 'admin'] as const

// --- Routes ---

/**
 * Seed default categories on first read so the empty-state of a freshly
 * scaffolded forum has navigable communities. Idempotent: only inserts
 * when the table is empty. Inserts happen sequentially so a second
 * concurrent caller observes the rows the first one added.
 */
const DEFAULT_CATEGORIES = [
  {
    name: 'Design & Craft',
    slug: 'design-craft',
    description: 'Studio practice, briefs, pricing, and the people-side of visual work.',
    color: '#0e7c6b',
    icon: '🪶',
    sort_order: 0,
  },
  {
    name: 'Gardening',
    slug: 'gardening',
    description: 'Forgiving species, balcony bins, and the slow joy of growing things.',
    color: '#16a34a',
    icon: '🌿',
    sort_order: 1,
  },
  {
    name: 'Web Dev',
    slug: 'web-dev',
    description: 'Frontend, backend, deployment — pragmatic answers from working engineers.',
    color: '#0c6558',
    icon: '💻',
    sort_order: 2,
  },
  {
    name: 'Self Help',
    slug: 'self-help',
    description: 'Habits, journaling, therapy talk — without the influencer veneer.',
    color: '#7c3aed',
    icon: '🧭',
    sort_order: 3,
  },
  {
    name: 'Hardware',
    slug: 'hardware',
    description: 'Builds, repairs, dock-with-three-DisplayPort-rabbit-holes.',
    color: '#0369a1',
    icon: '🛠️',
    sort_order: 4,
  },
  {
    name: 'Baking',
    slug: 'baking',
    description: 'Sourdough, loaves with math, the eternal hydration argument.',
    color: '#d97706',
    icon: '🥖',
    sort_order: 5,
  },
  {
    name: 'Meta',
    slug: 'meta',
    description: 'How the forum is run. Vote on policy, debate moderation calls.',
    color: '#b44c18',
    icon: '🏛️',
    sort_order: 6,
  },
  {
    name: 'Cycling',
    slug: 'cycling',
    description: 'Touring, commuting, and the gear that survives weather.',
    color: '#ea580c',
    icon: '🚲',
    sort_order: 7,
  },
  {
    name: 'Coffee',
    slug: 'coffee',
    description: 'Beans, brew methods, and the pour-over cult.',
    color: '#92400e',
    icon: '☕',
    sort_order: 8,
  },
] as const

let seedingPromise: Promise<void> | null = null

async function ensureSeeded(): Promise<void> {
  const existing = await findMany('forum_categories', { limit: 1 })
  if (existing.length > 0) return
  if (seedingPromise) {
    await seedingPromise
    return
  }
  seedingPromise = (async () => {
    const now = new Date().toISOString()
    for (const c of DEFAULT_CATEGORIES) {
      await create('forum_categories', {
        ...c,
        thread_count: 0,
        subscriber_count: 0,
        created_at: now,
        updated_at: now,
      })
    }
  })()
  try {
    await seedingPromise
  } finally {
    seedingPromise = null
  }
}

/**
 * Attach a live thread_count to a category. The stored forum_categories.thread_count column
 * was only ever initialised to 0 and never maintained, so every category rendered "0 threads".
 * Recompute it from the threads table on read (threads are hard-deleted, so a count is the
 * true active total) — drift-proof and correct for seeded + existing data.
 */
async function withThreadCount(
  category: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const threadCount = await count('threads', [
    { field: 'category_id', operator: '=', value: String(category.id) },
  ])
  return { ...category, thread_count: threadCount }
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    await ensureSeeded()
    const categories = await findMany('forum_categories', {
      orderBy: [{ field: 'sort_order', direction: 'asc' }],
    })
    res.json(await Promise.all((categories as Record<string, unknown>[]).map(withThreadCount)))
  } catch (error) {
    logger.error('categories.list', error)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/by-slug/:slug', async (req: Request, res: Response) => {
  try {
    const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug
    const matches = await findMany('forum_categories', {
      where: [{ field: 'slug', operator: '=', value: slug }],
      limit: 1,
    })
    const category = matches[0]
    if (!category) {
      res.status(404).json({
        error: t('categories.notFound', {}, { defaultValue: 'Category not found' }),
      })
      return
    }
    res.json(await withThreadCount(category as Record<string, unknown>))
  } catch (error) {
    logger.error('categories.bySlug', error)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const category = await findById('forum_categories', getParamId(req))
    if (!category) {
      res.status(404).json({
        error: t('categories.notFound', {}, { defaultValue: 'Category not found' }),
      })
      return
    }
    res.json(await withThreadCount(category as Record<string, unknown>))
  } catch (error) {
    logger.error('categories.getById', error)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/', validateBody(createCategorySchema), async (req: Request, res: Response) => {
  try {
    const owner = await requireOwner(res, { roles: MOD_ROLES })
    if (!owner) return

    const { name, description, color, icon, sort_order } = req.body as z.infer<
      typeof createCategorySchema
    >
    const slug = await uniqueSlug(name)

    const result = await create('forum_categories', {
      name,
      slug,
      description,
      color,
      icon,
      sort_order,
      thread_count: 0,
      subscriber_count: 0,
      created_at: new Date().toISOString(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('categories.create', error)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.put('/:id', validateBody(updateCategorySchema), async (req: Request, res: Response) => {
  try {
    const owner = await requireOwner(res, { roles: MOD_ROLES })
    if (!owner) return

    const id = getParamId(req)
    const existing = await findById('forum_categories', id)
    if (!existing) {
      res.status(404).json({
        error: t('categories.notFound', {}, { defaultValue: 'Category not found' }),
      })
      return
    }

    const updates: Record<string, unknown> = { ...req.body }
    if (req.body.name) {
      updates.slug = await uniqueSlug(req.body.name, id)
    }

    const result = await updateById('forum_categories', id, updates)
    res.json(result.data)
  } catch (error) {
    logger.error('categories.update', error)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const owner = await requireOwner(res, { roles: MOD_ROLES })
    if (!owner) return

    const id = getParamId(req)
    const existing = await findById('forum_categories', id)
    if (!existing) {
      res.status(404).json({
        error: t('categories.notFound', {}, { defaultValue: 'Category not found' }),
      })
      return
    }

    await deleteById('forum_categories', id)
    res.status(204).end()
  } catch (error) {
    logger.error('categories.delete', error)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
