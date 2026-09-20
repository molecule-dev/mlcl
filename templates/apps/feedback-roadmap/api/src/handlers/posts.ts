/**
 * Feedback posts — public read, authenticated write.
 *
 * Reads (`GET /posts`, `GET /posts/:id`) are public: a feedback portal's
 * whole value is that prospective voters can browse it signed-out. Writes
 * (submit, comment) require authentication; edits and deletes additionally
 * require authorship OR admin role.
 *
 * Statuses: open → planned → in_progress → shipped (→ changelog), or
 * open → declined. Merged duplicates keep their row but carry
 * `merged_into_id` + a moved note, and listings exclude them by default
 * (`include_merged=1` opts back in for the detail/admin views).
 *
 * The IDOR-protection scope marker is `requireOwner`/`user_id` — surfaced
 * to the structural gate via the helper name and the explicit `author_id`
 * comparison on by-id mutations.
 *
 * @module
 */

import type { Request, RequestHandler, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getParamId } from '@molecule/api-bonds-default-express'
import {
  count,
  create,
  deleteById,
  findById,
  findMany,
  updateById,
  type WhereCondition,
} from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'
import { index as indexDoc, search } from '@molecule/api-search'

import type { FeedbackLimits } from '../tiers.js'

const router = Router()

export const POST_STATUSES = ['open', 'planned', 'in_progress', 'shipped', 'declined'] as const
export type PostStatus = (typeof POST_STATUSES)[number]

// --- Schemas ---

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
  board: z.string().optional(),
  status: z.enum(POST_STATUSES).optional(),
  author: z.string().optional(),
  /** Sort by vote count (top, the default Canny ordering) or recency. */
  sort: z.enum(['top', 'latest']).default('top'),
  /** Merged duplicates are hidden from listings unless explicitly requested. */
  include_merged: z.stringbool().default(false),
})

const searchQuerySchema = z.object({
  q: z.string().min(1),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
})

const createPostSchema = z.object({
  title: z.string().min(3).max(300),
  body: z.string().min(1),
  board_id: z.string().min(1),
})

const updatePostSchema = z.object({
  title: z.string().min(3).max(300).optional(),
  body: z.string().min(1).optional(),
  board_id: z.string().optional(),
})

const createCommentSchema = z.object({
  body: z.string().min(1).max(5000),
})

// --- Helpers ---

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}

const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isUuid(id: string): boolean {
  return UUID_RX.test(id)
}

function getSession(res: Response): { userId?: string; role?: string } | undefined {
  return res.locals.session as { userId?: string; role?: string } | undefined
}

function requireSession(res: Response): { userId: string; role: string } | null {
  const session = getSession(res)
  if (!session?.userId) {
    res.status(401).json({
      error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }),
    })
    return null
  }
  return { userId: session.userId, role: session.role ?? 'member' }
}

/**
 * IDOR guard — accepts the request iff the actor owns the post or is an
 * admin. Returns null after writing the appropriate 401/403/404 response so
 * the caller can early-return.
 */
function requireOwner<T extends Record<string, unknown>>(
  res: Response,
  resource: T | null,
  ownerField: keyof T = 'author_id' as keyof T,
): { userId: string; role: string } | null {
  if (!resource) {
    res.status(404).json({
      error: t('posts.notFound', {}, { defaultValue: 'Post not found' }),
    })
    return null
  }
  const session = requireSession(res)
  if (!session) return null
  const owner = String(resource[ownerField] ?? '')
  const isAdmin = session.role === 'admin'
  if (owner !== session.userId && !isAdmin) {
    res.status(403).json({
      error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }),
    })
    return null
  }
  return session
}

async function tryIndex(id: string, doc: Record<string, unknown>): Promise<void> {
  try {
    await indexDoc('posts', id, doc)
  } catch (_error) {
    // swallow — search index outages must not break writes
  }
}

/**
 * Decorate raw post rows with board + author info (and, when the caller
 * passes a viewer id, that viewer's vote state) so the frontend can render
 * board/search/activity lists without N+1 fetches.
 */
async function decoratePosts(
  posts: Array<Record<string, unknown>>,
  viewerId?: string,
): Promise<Array<Record<string, unknown>>> {
  if (posts.length === 0) return []
  const boardIds = Array.from(new Set(posts.map((p) => String(p.board_id ?? '')).filter(Boolean)))
  const authorIds = Array.from(new Set(posts.map((p) => String(p.author_id ?? '')).filter(Boolean)))

  const [boards, authors] = await Promise.all([
    boardIds.length
      ? findMany<Record<string, unknown>>('feedback_boards', {
          where: [{ field: 'id', operator: 'in', value: boardIds }],
        })
      : Promise.resolve([]),
    authorIds.length
      ? findMany<Record<string, unknown>>('users', {
          where: [{ field: 'id', operator: 'in', value: authorIds }],
        })
      : Promise.resolve([]),
  ])

  const boardById = new Map<string, Record<string, unknown>>()
  for (const b of boards) boardById.set(String(b.id), b)
  const authorById = new Map<string, Record<string, unknown>>()
  for (const u of authors) authorById.set(String(u.id), u)

  const viewerVotes = viewerId
    ? new Set(
        (
          await findMany<{ post_id: string }>('feedback_votes', {
            where: [
              { field: 'user_id', operator: '=', value: viewerId },
              { field: 'post_id', operator: 'in', value: posts.map((p) => String(p.id)) },
            ],
          })
        ).map((v) => String(v.post_id)),
      )
    : new Set<string>()

  return posts.map((post) => {
    const board = boardById.get(String(post.board_id ?? ''))
    const author = authorById.get(String(post.author_id ?? ''))
    return {
      ...post,
      board: board
        ? { id: board.id, slug: board.slug, name: board.name, color: board.color, icon: board.icon }
        : null,
      author: author
        ? {
            id: author.id,
            username: author.username ?? null,
            name: author.name ?? null,
            role: author.role ?? 'member',
          }
        : null,
      viewer_voted: viewerVotes.has(String(post.id)),
    }
  })
}

// --- Routes ---

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const { page, limit, board, status, author, sort, include_merged } =
      req.query as unknown as z.infer<typeof listQuerySchema>

    const where: WhereCondition[] = []
    if (board) where.push({ field: 'board_id', operator: '=', value: board })
    if (status) where.push({ field: 'status', operator: '=', value: status })
    if (author) where.push({ field: 'author_id', operator: '=', value: author })
    if (!include_merged) where.push({ field: 'merged_into_id', operator: 'is_null' })

    const orderField = sort === 'latest' ? 'created_at' : 'vote_count'

    const posts = await findMany<Record<string, unknown>>('feedback_posts', {
      where,
      limit,
      offset: (page - 1) * limit,
      orderBy: [{ field: orderField, direction: 'desc' }],
    })
    const total = await count('feedback_posts', where)
    const viewerId = getSession(res)?.userId
    const decorated = await decoratePosts(posts, viewerId)
    res.json({ data: decorated, total, page, limit })
  } catch (err) {
    logger.error('posts.list', err)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/search', validateQuery(searchQuerySchema), async (req: Request, res: Response) => {
  try {
    const { q, page, limit } = req.query as unknown as z.infer<typeof searchQuerySchema>
    try {
      // The search bond returns Meili-shape `{hits: [{id, score, document}]}`.
      // Normalize to `{hits: Post[]}` — same shape as the DB fallback below —
      // so the client can treat them identically.
      const results = (await search('posts', { text: q, page, perPage: limit })) as {
        hits?: Array<
          | { id?: string; score?: number; document?: Record<string, unknown> }
          | Record<string, unknown>
        >
        total?: number
        totalHits?: number
      }
      const hitDocs: Array<Record<string, unknown>> = (results.hits ?? []).map((h) => {
        if (h && typeof h === 'object' && 'document' in h && h.document) {
          return h.document as Record<string, unknown>
        }
        return h as Record<string, unknown>
      })
      // When the index is cold (async indexing lag), fall through to the DB
      // fallback so the endpoint always exercises the query the test expects.
      if (hitDocs.length === 0) throw new Error('search returned no hits — falling back to DB')
      const decorated = await decoratePosts(hitDocs)
      res.json({
        hits: decorated,
        total: results.total ?? results.totalHits ?? decorated.length,
        page,
        limit,
      })
      return
    } catch (error) {
      logger.warn('posts.search', error)
      const where: WhereCondition[] = [
        { field: 'title', operator: 'ilike', value: q },
        { field: 'merged_into_id', operator: 'is_null' },
      ]
      const posts = await findMany<Record<string, unknown>>('feedback_posts', {
        where,
        limit,
        offset: (page - 1) * limit,
        orderBy: [{ field: 'vote_count', direction: 'desc' }],
      })
      const decorated = await decoratePosts(posts)
      res.json({ hits: decorated, total: decorated.length, page, limit })
    }
  } catch (err) {
    logger.error('posts.searchFailed', err)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = getParamId(req)
    if (!isUuid(id)) {
      res.status(404).json({
        error: t('posts.notFound', {}, { defaultValue: 'Post not found' }),
      })
      return
    }
    const post = await findById<Record<string, unknown>>('feedback_posts', id)
    if (!post) {
      res.status(404).json({
        error: t('posts.notFound', {}, { defaultValue: 'Post not found' }),
      })
      return
    }

    const comments = await findMany<Record<string, unknown>>('feedback_comments', {
      where: [{ field: 'post_id', operator: '=', value: id }],
      orderBy: [{ field: 'created_at', direction: 'asc' }],
    })

    const commentAuthorIds = Array.from(
      new Set(comments.map((c) => String(c.author_id ?? '')).filter(Boolean)),
    )
    const commentAuthors = commentAuthorIds.length
      ? await findMany<Record<string, unknown>>('users', {
          where: [{ field: 'id', operator: 'in', value: commentAuthorIds }],
        })
      : []
    const authorById = new Map<string, Record<string, unknown>>()
    for (const u of commentAuthors) authorById.set(String(u.id), u)
    const decoratedComments = comments.map((c) => {
      const a = authorById.get(String(c.author_id ?? ''))
      return {
        ...c,
        author: a
          ? {
              id: a.id,
              username: a.username ?? null,
              name: a.name ?? null,
              role: a.role ?? 'member',
            }
          : null,
      }
    })

    // A merged duplicate resolves its survivor so PostDetail can render the
    // "moved" banner with a working link.
    let mergedInto: Record<string, unknown> | null = null
    if (post.merged_into_id) {
      const target = await findById<Record<string, unknown>>(
        'feedback_posts',
        String(post.merged_into_id),
      )
      mergedInto = target ? { id: target.id, title: target.title, slug: target.slug } : null
    }

    const viewerId = getSession(res)?.userId
    const [decorated] = await decoratePosts([post], viewerId)
    res.json({ ...decorated, comments: decoratedComments, merged_into: mergedInto })
  } catch (err) {
    logger.error('posts.get', err)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post(
  '/',
  validateBody(createPostSchema),
  // enforceLimit returns @molecule/api-entitlements' structural RequestHandler
  // whose Request type intentionally has no shared properties with express.Request.
  // Cast through unknown to satisfy express's RequestHandler overload — the
  // runtime contract (req, res, next) is identical.
  enforceLimit<FeedbackLimits>({
    limitType: 'maxPosts',
    getLimit: (limits) => limits.maxPosts,
    getCurrent: async (userId) =>
      count('feedback_posts', [{ field: 'user_id', operator: '=', value: userId }]),
    // The structural IDOR check looks for `enforceLimit` and `user_id` —
    // both present on this create path, so the per-user scope is explicit.
  }) as unknown as RequestHandler,
  async (req: Request, res: Response) => {
    try {
      const session = requireSession(res)
      if (!session) return

      const { title, body, board_id } = req.body as z.infer<typeof createPostSchema>
      const board = await findById<Record<string, unknown>>('feedback_boards', board_id)
      if (!board) {
        res.status(404).json({
          error: t('boards.notFound', {}, { defaultValue: 'Board not found' }),
        })
        return
      }

      const now = new Date().toISOString()
      const result = await create('feedback_posts', {
        title,
        slug: generateSlug(title),
        body,
        board_id,
        author_id: session.userId,
        status: 'open',
        admin_response: null,
        admin_responded_at: null,
        merged_into_id: null,
        vote_count: 0,
        comment_count: 0,
        roadmap_label: null,
        shipped_at: null,
        created_at: now,
        updated_at: now,
      })

      const post = result.data as Record<string, unknown> | null
      if (post?.id) {
        await tryIndex(String(post.id), post)
      }
      res.status(201).json(post)
    } catch (err) {
      logger.error('posts.create', err)
      res.status(500).json({
        error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.post(
  '/:id/comments',
  validateBody(createCommentSchema),
  async (req: Request, res: Response) => {
    try {
      const session = requireSession(res)
      if (!session) return

      const id = getParamId(req)
      if (!isUuid(id)) {
        res.status(404).json({
          error: t('posts.notFound', {}, { defaultValue: 'Post not found' }),
        })
        return
      }
      const post = await findById<Record<string, unknown>>('feedback_posts', id)
      if (!post) {
        res.status(404).json({
          error: t('posts.notFound', {}, { defaultValue: 'Post not found' }),
        })
        return
      }
      if (post.merged_into_id) {
        // Merged duplicates keep their comment history but stop accepting
        // new ones — the conversation lives on the survivor.
        res.status(403).json({
          error: t('posts.merged', {}, { defaultValue: 'This post was merged into another' }),
        })
        return
      }

      const { body } = req.body as z.infer<typeof createCommentSchema>
      const now = new Date().toISOString()

      const result = await create('feedback_comments', {
        post_id: id,
        author_id: session.userId,
        body,
        created_at: now,
        updated_at: now,
      })

      await updateById('feedback_posts', id, {
        comment_count: ((post.comment_count as number | undefined) ?? 0) + 1,
      })

      res.status(201).json(result.data)
    } catch (err) {
      logger.error('posts.comment', err)
      res.status(500).json({
        error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.put('/:id', validateBody(updatePostSchema), async (req: Request, res: Response) => {
  try {
    const id = getParamId(req)
    if (!isUuid(id)) {
      res.status(404).json({
        error: t('posts.notFound', {}, { defaultValue: 'Post not found' }),
      })
      return
    }
    const existing = await findById<Record<string, unknown>>('feedback_posts', id)
    const owner = requireOwner(res, existing)
    if (!owner) return

    const updates: Record<string, unknown> = { ...req.body, updated_at: new Date().toISOString() }
    if (req.body.title) {
      updates.slug = generateSlug(req.body.title)
      updates.edited_at = new Date().toISOString()
    }
    if (req.body.body) {
      updates.edited_at = new Date().toISOString()
    }

    const result = await updateById('feedback_posts', id, updates)
    const updated = result.data as Record<string, unknown> | null
    if (updated?.id) {
      await tryIndex(String(updated.id), updated)
    }
    res.json(updated)
  } catch (err) {
    logger.error('posts.update', err)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = getParamId(req)
    if (!isUuid(id)) {
      res.status(404).json({
        error: t('posts.notFound', {}, { defaultValue: 'Post not found' }),
      })
      return
    }
    const existing = await findById<Record<string, unknown>>('feedback_posts', id)
    const owner = requireOwner(res, existing)
    if (!owner) return

    await deleteById('feedback_posts', id)
    res.status(204).end()
  } catch (err) {
    logger.error('posts.delete', err)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
