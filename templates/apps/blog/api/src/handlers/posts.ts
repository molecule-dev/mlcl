import type { Request, RequestHandler, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { convert, resize } from '@molecule/api-image'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'
import { index as indexDoc, search } from '@molecule/api-search'

import type { BlogLimits } from '../tiers.js'
import { promoteDueScheduledPosts } from './_scheduled.js'

const router = Router()

// --- Schemas ---

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  tag: z.string().optional(),
  category: z.string().optional(),
})

const searchQuerySchema = z.object({
  q: z.string().min(1),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

const createPostSchema = z.object({
  title: z.string().min(1).max(500),
  // Accept both `content` (canonical) and `body` (UI shorthand). The
  // editor calls the field `body`; the DB column is `content`. Mapping
  // here keeps a single source of truth in the DB layer.
  content: z.string().optional().default(''),
  body: z.string().optional(),
  excerpt: z.string().optional().default(''),
  category_id: z.string().optional().default(''),
  tags: z.array(z.string()).optional().default([]),
  // Accept both shapes — see content/body comment above.
  cover_image_url: z.string().optional().default(''),
  coverImage: z.string().optional(),
  // Allow the editor to publish in one shot by passing status='published'.
  // When provided the handler fans out to the publish path so
  // `published_at` is set in the same write.
  status: z.enum(['draft', 'published']).optional(),
})

const updatePostSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  content: z.string().optional(),
  body: z.string().optional(),
  excerpt: z.string().optional(),
  category_id: z.string().optional(),
  tags: z.array(z.string()).optional(),
  cover_image_url: z.string().optional(),
  coverImage: z.string().optional(),
  status: z.enum(['draft', 'published', 'scheduled']).optional(),
})

const scheduleSchema = z.object({
  publish_at: z.string().min(1),
})

const mineQuerySchema = z.object({
  status: z.enum(['draft', 'published', 'scheduled']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

// --- Helpers ---

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * A URL slug that is unique among posts. The slugified title is used as-is when
 * free; otherwise a numeric suffix (`-2`, `-3`, …) is appended until no OTHER post
 * owns it. Without this, two posts with the same title collide on one slug and
 * `GET /by-slug/:slug` (limit 1) can only ever reach one of them — the other post
 * becomes unreachable by its own URL. `excludeId` lets a post keep its slug on update.
 * (A DB `UNIQUE (slug)` constraint would additionally close the concurrent-create race.)
 */
async function uniqueSlug(title: string, excludeId?: string): Promise<string> {
  const base = generateSlug(title) || 'post'
  let candidate = base
  for (let n = 2; n < 10_000; n += 1) {
    const clash = await findMany<{ id: string }>('posts', {
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

/**
 * Best-effort search-index update. Indexing is a downstream concern —
 * if Meilisearch is down or running with placeholder credentials it
 * must not break post writes (the database is the source of truth).
 */
async function tryIndex(id: string, doc: Record<string, unknown>): Promise<void> {
  try {
    await indexDoc('posts', id, doc)
  } catch (_error) {
    // Indexing is best-effort — if Meilisearch is down it must not break post writes
  }
}

// --- Routes ---

// List published posts with pagination.
router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    await promoteDueScheduledPosts()
    const { page, limit, tag, category } = req.query as unknown as z.infer<typeof listQuerySchema>
    const where: WhereCondition[] = [{ field: 'status', operator: '=', value: 'published' }]
    if (tag) where.push({ field: 'tags', operator: 'ilike', value: tag })
    if (category) where.push({ field: 'category_id', operator: '=', value: category })

    const posts = await findMany('posts', {
      where,
      limit,
      offset: (page - 1) * limit,
      orderBy: [{ field: 'published_at', direction: 'desc' }],
    })
    const total = await count('posts', where)
    res.json({ data: posts, total, page, limit })
  } catch (err) {
    console.error('[posts.list]', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Search posts
router.get('/search', validateQuery(searchQuerySchema), async (req: Request, res: Response) => {
  try {
    const { q, page, limit } = req.query as unknown as z.infer<typeof searchQuerySchema>
    const results = await search('posts', {
      text: q,
      page,
      perPage: limit,
    })
    res.json(results)
  } catch (error) {
    logger.error('posts.search failed', { error })
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Get post by slug (public)
router.get('/by-slug/:slug', async (req: Request, res: Response) => {
  try {
    await promoteDueScheduledPosts()
    const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug
    const posts = await findMany('posts', {
      where: [
        { field: 'slug', operator: '=', value: slug },
        { field: 'status', operator: '=', value: 'published' },
      ],
      limit: 1,
    })
    const post = posts[0]
    if (!post) {
      res.status(404).json({ error: t('posts.notFound', {}, { defaultValue: 'Post not found' }) })
      return
    }
    res.json(post)
  } catch (error) {
    logger.error('posts.bySlug failed', { error })
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Get current user's posts (must be before /:id to avoid matching)
router.get('/mine/all', validateQuery(mineQuerySchema), async (req: Request, res: Response) => {
  try {
    await promoteDueScheduledPosts()
    const { status, page, limit } = req.query as unknown as z.infer<typeof mineQuerySchema>
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const where: WhereCondition[] = [{ field: 'author_id', operator: '=', value: userId }]
    if (status) where.push({ field: 'status', operator: '=', value: status })

    const posts = await findMany('posts', {
      where,
      limit,
      offset: (page - 1) * limit,
      orderBy: [{ field: 'updated_at', direction: 'desc' }],
    })
    res.json(posts)
  } catch (error) {
    logger.error('posts.mine failed', { error })
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Get post by ID (for editing). Visibility-scoped like the sibling read
// paths (GET / and GET /by-slug/:slug only return published posts): a
// non-published post is only visible to its author. Anyone else — anonymous
// or a different authenticated user — gets a 404 (not 403) so the existence
// of a draft/scheduled post id can't be probed.
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    const post = await findById<Record<string, unknown>>('posts', getParamId(req))
    if (!post || (post.status !== 'published' && post.author_id !== userId)) {
      res.status(404).json({ error: t('posts.notFound', {}, { defaultValue: 'Post not found' }) })
      return
    }
    res.json(post)
  } catch (error) {
    logger.error('posts.getById failed', { error })
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Create draft post (or publish in one shot when status='published').
router.post(
  '/',
  // enforceLimit returns @molecule/api-entitlements' structural RequestHandler
  // whose Request type intentionally has no shared properties with express.Request.
  // Cast through unknown to satisfy express's RequestHandler overload — the
  // runtime contract (req, res, next) is identical.
  enforceLimit<BlogLimits>({
    limitType: 'maxPosts',
    getLimit: (limits) => limits.maxPosts,
    // Posts are owned by author_id; user_id is a generated alias on the row
    // for cross-resource limit checks but counting by author_id is the
    // authoritative read path used everywhere else.
    getCurrent: async (userId) =>
      count('posts', [{ field: 'author_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createPostSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res
          .status(401)
          .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
        return
      }
      const body = req.body
      const title = body.title as string
      const content = (body.body ?? body.content ?? '') as string
      const excerpt = (body.excerpt ?? '') as string
      const category_id = (body.category_id ?? '') as string
      const tags = (body.tags ?? []) as string[]
      const cover_image_url = (body.coverImage ?? body.cover_image_url ?? '') as string
      const requestedStatus = body.status === 'published' ? 'published' : 'draft'
      const slug = await uniqueSlug(title)
      const now = new Date().toISOString()

      const result = await create('posts', {
        title,
        slug,
        content,
        excerpt,
        category_id,
        tags: JSON.stringify(tags),
        cover_image_url,
        status: requestedStatus,
        published_at: requestedStatus === 'published' ? now : null,
        author_id: userId,
        created_at: now,
        updated_at: now,
      })
      const created = result.data as Record<string, unknown> | null
      if (created && created.status === 'published' && created.id) {
        await tryIndex(String(created.id), created)
      }
      res.status(201).json(result.data)
    } catch (err) {
      // Surface server-side errors during dev so test failures are diagnosable.
      // In production this still returns a generic error to the client.
      console.error('[posts.create]', err)
      res
        .status(500)
        .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

// Update post — author-only.
router.put('/:id', validateBody(updatePostSchema), async (req: Request, res: Response) => {
  try {
    const id = getParamId(req)
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const existing = await findById<Record<string, unknown>>('posts', id)
    if (!existing) {
      res.status(404).json({ error: t('posts.notFound', {}, { defaultValue: 'Post not found' }) })
      return
    }
    if (existing.author_id !== userId) {
      res.status(403).json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
      return
    }

    // Normalise UI shorthand → DB columns. The editor sends `body` and
    // `coverImage`; the rest of the system reads `content` and
    // `cover_image_url`.
    const incoming: Record<string, unknown> = { ...req.body }
    if ('body' in incoming) {
      incoming.content = incoming.body
      delete incoming.body
    }
    if ('coverImage' in incoming) {
      incoming.cover_image_url = incoming.coverImage
      delete incoming.coverImage
    }

    const updates: Record<string, unknown> = { ...incoming, updated_at: new Date().toISOString() }
    if (incoming.title && incoming.title !== existing.title) {
      updates.slug = await uniqueSlug(incoming.title as string, id)
    }
    if (updates.tags && Array.isArray(updates.tags)) {
      updates.tags = JSON.stringify(updates.tags)
    }
    // Status transitions imply published_at maintenance.
    if (incoming.status === 'published' && existing.status !== 'published') {
      updates.published_at = new Date().toISOString()
    }
    if (incoming.status === 'draft') {
      updates.published_at = null
    }

    const result = await updateById('posts', id, updates)
    const post = result.data as Record<string, unknown> | null
    if (post && post.status === 'published' && post.id) {
      await tryIndex(String(post.id), post)
    }
    res.json(result.data)
  } catch (err) {
    console.error('[posts.update]', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

async function loadOwnedPost(req: Request, res: Response): Promise<Record<string, unknown> | null> {
  const id = getParamId(req)
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return null
  }
  const post = await findById<Record<string, unknown>>('posts', id)
  if (!post) {
    res.status(404).json({ error: t('posts.notFound', {}, { defaultValue: 'Post not found' }) })
    return null
  }
  if (post.author_id !== userId) {
    res.status(403).json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
    return null
  }
  return post
}

router.post('/:id/publish', async (req: Request, res: Response) => {
  try {
    const post = await loadOwnedPost(req, res)
    if (!post) return

    const now = new Date().toISOString()
    const result = await updateById('posts', getParamId(req), {
      status: 'published',
      published_at: now,
      updated_at: now,
    })
    const published = result.data as Record<string, unknown> | null
    if (published && published.id) {
      await tryIndex(String(published.id), published)
    }
    res.json(result.data)
  } catch (err) {
    console.error('[posts.publish]', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/:id/schedule', validateBody(scheduleSchema), async (req: Request, res: Response) => {
  try {
    const post = await loadOwnedPost(req, res)
    if (!post) return

    const result = await updateById('posts', getParamId(req), {
      status: 'scheduled',
      scheduled_at: req.body.publish_at,
      updated_at: new Date().toISOString(),
    })
    res.json(result.data)
  } catch (err) {
    console.error('[posts.schedule]', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/:id/unpublish', async (req: Request, res: Response) => {
  try {
    const post = await loadOwnedPost(req, res)
    if (!post) return

    const result = await updateById('posts', getParamId(req), {
      status: 'draft',
      published_at: null,
      updated_at: new Date().toISOString(),
    })
    res.json(result.data)
  } catch (err) {
    console.error('[posts.unpublish]', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

/**
 * Generate post excerpt. The @molecule/api-ai-summarization core
 * interface is currently a stub (no concrete `summarize()` method on
 * any wired provider), so we use a smart truncation that ends on the
 * nearest sentence/word boundary instead of cutting mid-word. This
 * gives a usable excerpt without lying to the user about "AI summary".
 */
router.post('/:id/summarize', async (req: Request, res: Response) => {
  try {
    const post = await loadOwnedPost(req, res)
    if (!post) return

    const content = String(post.content || '').trim()
    let excerpt: string
    if (content.length <= 200) {
      excerpt = content
    } else {
      // Prefer sentence boundary, then word boundary
      const slice = content.slice(0, 200)
      const lastSentence = Math.max(
        slice.lastIndexOf('. '),
        slice.lastIndexOf('! '),
        slice.lastIndexOf('? '),
      )
      if (lastSentence > 100) {
        excerpt = slice.slice(0, lastSentence + 1)
      } else {
        const lastSpace = slice.lastIndexOf(' ')
        excerpt = (lastSpace > 0 ? slice.slice(0, lastSpace) : slice) + '...'
      }
    }

    const result = await updateById('posts', getParamId(req), {
      excerpt,
      updated_at: new Date().toISOString(),
    })
    res.json(result.data)
  } catch (err) {
    console.error('[posts.summarize]', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

/**
 * Upload cover image. Resized to 1200x630 (Open Graph) and converted to
 * WebP. Stored as a data URL inline on the post — the uploads bond
 * interface wants a stream + multipart form, not a base64 body, so for
 * the JSON-body path we keep the data URL approach. Apps wanting S3
 * should use the dedicated /api/uploads multipart endpoint and pass
 * the returned URL through to a separate PUT /:id with cover_image_url.
 */
router.post('/:id/cover-image', async (req: Request, res: Response) => {
  try {
    const post = await loadOwnedPost(req, res)
    if (!post) return

    if (!req.body.image) {
      res
        .status(400)
        .json({ error: t('posts.imageRequired', {}, { defaultValue: 'Image data is required' }) })
      return
    }

    const imageBuffer = Buffer.from(req.body.image, 'base64')
    const resized = await resize(imageBuffer, { width: 1200, height: 630, fit: 'cover' })
    const webp = await convert(resized, 'webp', 80)
    const dataUrl = `data:image/webp;base64,${webp.toString('base64')}`

    const result = await updateById('posts', getParamId(req), {
      cover_image_url: dataUrl,
      updated_at: new Date().toISOString(),
    })
    res.json(result.data)
  } catch (err) {
    console.error('[posts.cover-image]', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const post = await loadOwnedPost(req, res)
    if (!post) return

    await deleteById('posts', getParamId(req))
    res.status(204).end()
  } catch (err) {
    logger.error('posts.delete failed', { error: err })
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
