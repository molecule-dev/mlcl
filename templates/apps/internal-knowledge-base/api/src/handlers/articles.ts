/**
 * Article handlers — space-scoped CRUD over `articles`.
 *
 * Articles belong to a space; access is gated through `requireSpaceMembership`
 * (read) and `requireSpaceWriteAccess` (write). On every PATCH we record an
 * `article_versions` row so the editor's version history works.
 */

import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { count, create, deleteById, findMany, findOne, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import {
  type ArticleRow,
  type ArticleVersionRow,
  internalError,
  type NotificationRow,
  requireReadableArticle,
  requireSpaceMembership,
  requireSpaceWriteAccess,
  requireUser,
  requireWritableArticle,
  type SpaceMemberRow,
  type SpaceRow,
  validationError,
} from '../lib/authz.js'
import { sanitizeHtml } from '../lib/sanitize-html.js'
import type { InternalKnowledgeBaseLimits } from '../tiers.js'

interface UserMinimal {
  id: string
  name: string | null
  email: string
}

/**
 * Fan out a notification to every recipient who can see the space (creator
 * + members) other than the actor. Best-effort — failures are logged but
 * never break the article-publish flow.
 */
async function notifyArticlePublished(article: ArticleRow, actorUserId: string): Promise<void> {
  try {
    const space = await findOne<SpaceRow>('spaces', [
      { field: 'id', operator: '=', value: article.space_id },
    ])
    if (!space) return
    const recipients = new Set<string>()
    if (space.created_by_user_id && space.created_by_user_id !== actorUserId) {
      recipients.add(space.created_by_user_id)
    }
    const members = await findMany<SpaceMemberRow>('space_members', {
      where: [{ field: 'space_id', operator: '=', value: article.space_id }],
    })
    for (const m of members) {
      if (m.user_id && m.user_id !== actorUserId) recipients.add(m.user_id)
    }
    if (recipients.size === 0) return
    const actor = await findOne<UserMinimal>('users', [
      { field: 'id', operator: '=', value: actorUserId },
    ])
    const actorName = actor?.name?.trim() || actor?.email || 'A teammate'
    const payload: Record<string, unknown> = {
      title: article.title,
      actor: actorName,
      actor_user_id: actorUserId,
      article_id: article.id,
      space_id: article.space_id,
      space_name: space.name,
      space_key: space.key,
      href: `/article/${article.id}`,
    }
    await Promise.all(
      Array.from(recipients).map((uid) =>
        create<NotificationRow>('notifications', {
          user_id: uid,
          kind: 'article_published',
          payload,
          read_at: null,
        }).catch((err: unknown) => {
          logger.error(err)
          return null
        }),
      ),
    )
  } catch (err: unknown) {
    logger.error(err)
  }
}

const router = Router()

const idParam = z.object({ id: z.string().uuid() })

const listQuerySchema = z.object({
  space_id: z.string().min(1).optional(),
  status: z.enum(['draft', 'published']).optional(),
  author_user_id: z.string().uuid().optional(),
  parent_article_id: z.string().uuid().nullable().optional(),
  q: z.string().min(1).max(255).optional(),
  sort: z.string().max(64).optional(),
  order: z.enum(['asc', 'desc']).optional(),
})

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function resolveSpaceId(idOrKey: string): Promise<string | null> {
  if (UUID_RE.test(idOrKey)) return idOrKey
  const space = await findOne<SpaceRow>('spaces', [{ field: 'key', operator: '=', value: idOrKey }])
  return space?.id ?? null
}

const createSchema = z.object({
  space_id: z.string().uuid(),
  title: z.string().min(1).max(1000),
  slug: z.string().max(255).optional(),
  body_md: z.string().max(200_000).optional(),
  body_html: z.string().max(400_000).optional(),
  parent_article_id: z.string().uuid().nullable().optional(),
  status: z.enum(['draft', 'published']).optional(),
})

const updateSchema = z.object({
  title: z.string().min(1).max(1000).optional(),
  slug: z.string().max(255).optional(),
  body_md: z.string().max(200_000).optional(),
  body_html: z.string().max(400_000).optional(),
  parent_article_id: z.string().uuid().nullable().optional(),
  status: z.enum(['draft', 'published']).optional(),
  change_summary: z.string().max(255).optional(),
})

router.get('/', async (req: Request, res: Response) => {
  const uid = requireUser(res)
  if (!uid) return
  const q = listQuerySchema.safeParse(req.query)
  if (!q.success) {
    validationError(res, q.error.issues)
    return
  }
  try {
    if (!q.data.space_id) {
      // No space filter. Two modes:
      //   - With `q` (search): return every article the user has read access
      //     to (own spaces + member spaces) whose title or body matches the
      //     query.
      //   - Without `q` (drafts/home page): return only the user's own
      //     articles.
      if (q.data.q) {
        const ownSpaces = await findMany<SpaceRow>('spaces', {
          where: [{ field: 'created_by_user_id', operator: '=', value: uid }],
        })
        const memberRows = await findMany<SpaceMemberRow>('space_members', {
          where: [{ field: 'user_id', operator: '=', value: uid }],
        })
        const accessibleSpaceIds = Array.from(
          new Set([...ownSpaces.map((s) => s.id), ...memberRows.map((m) => m.space_id)]),
        )
        if (accessibleSpaceIds.length === 0) {
          res.json([])
          return
        }
        const articles = await findMany<ArticleRow>('articles', {
          where: [{ field: 'space_id', operator: 'in', value: accessibleSpaceIds }],
          orderBy: [{ field: 'last_edited_at', direction: 'desc' }],
        })
        const needle = q.data.q.toLowerCase()
        const matched = articles.filter(
          (a) =>
            a.title.toLowerCase().includes(needle) ||
            (a.body_md ?? '').toLowerCase().includes(needle),
        )
        res.json(matched)
        return
      }
      const items = await findMany<ArticleRow>('articles', {
        where: [{ field: 'author_user_id', operator: '=', value: uid }],
        orderBy: [{ field: 'updated_at', direction: 'desc' }],
      })
      res.json(items)
      return
    }
    // Resolve key→id for slug-based routes; verify membership.
    const resolved = await resolveSpaceId(q.data.space_id)
    if (!resolved) {
      res.json([])
      return
    }
    const space = await requireSpaceMembership(resolved, uid)
    if (!space) {
      res.json([])
      return
    }
    const where: Array<{ field: string; operator: '='; value: unknown }> = [
      { field: 'space_id', operator: '=', value: resolved },
    ]
    if (q.data.status) where.push({ field: 'status', operator: '=', value: q.data.status })
    if (q.data.author_user_id)
      where.push({ field: 'author_user_id', operator: '=', value: q.data.author_user_id })
    if (q.data.parent_article_id !== undefined)
      where.push({
        field: 'parent_article_id',
        operator: '=',
        value: q.data.parent_article_id,
      })
    const items = await findMany<ArticleRow>('articles', {
      where,
      orderBy: [{ field: 'last_edited_at', direction: 'desc' }],
    })
    res.json(items)
  } catch (error) {
    internalError(res, error)
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  const uid = requireUser(res)
  if (!uid) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    validationError(res, id.error.issues)
    return
  }
  try {
    const article = await requireReadableArticle(id.data.id, uid)
    if (!article) {
      res
        .status(404)
        .json({ error: t('article.notFound', {}, { defaultValue: 'Article not found' }) })
      return
    }
    res.json(article)
  } catch (error) {
    internalError(res, error)
  }
})

// Enforce the per-tier article cap (tiers.ts maxArticles) — defined + advertised in Pricing but
// enforceLimit was never called, so any tier could create unlimited articles.
const enforceArticleLimit = enforceLimit<InternalKnowledgeBaseLimits>({
  limitType: 'maxArticles',
  getLimit: (limits) => limits.maxArticles,
  getCurrent: async (userId) =>
    count('articles', [{ field: 'author_user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post('/', enforceArticleLimit, async (req: Request, res: Response) => {
  const uid = requireUser(res)
  if (!uid) return
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) {
    validationError(res, parsed.error.issues)
    return
  }
  try {
    const access = await requireSpaceWriteAccess(parsed.data.space_id, uid)
    if (!access) {
      res.status(404).json({ error: t('space.notFound', {}, { defaultValue: 'Space not found' }) })
      return
    }
    const now = new Date()
    const status = parsed.data.status ?? 'draft'
    const result = await create<ArticleRow>('articles', {
      space_id: parsed.data.space_id,
      parent_article_id: parsed.data.parent_article_id ?? null,
      author_user_id: uid,
      last_edited_by_user_id: uid,
      title: parsed.data.title,
      slug: parsed.data.slug ?? '',
      body_md: parsed.data.body_md ?? '',
      // Sanitize client-supplied HTML at the trust boundary before storing —
      // it is later rendered to other space members via dangerouslySetInnerHTML.
      body_html: sanitizeHtml(parsed.data.body_html ?? ''),
      status,
      published_at: status === 'published' ? now : null,
      last_edited_at: now,
      created_at: now,
      updated_at: now,
    })
    if (status === 'published' && result.data) {
      await notifyArticlePublished(result.data as ArticleRow, uid)
    }
    res.status(201).json(result.data)
  } catch (error) {
    internalError(res, error)
  }
})

router.patch('/:id', async (req: Request, res: Response) => {
  const uid = requireUser(res)
  if (!uid) return
  const id = idParam.safeParse(req.params)
  const body = updateSchema.safeParse(req.body)
  if (!id.success || !body.success) {
    validationError(res, id.success ? body.error?.issues : id.error.issues)
    return
  }
  try {
    const article = await requireWritableArticle(id.data.id, uid)
    if (!article) {
      res
        .status(404)
        .json({ error: t('article.notFound', {}, { defaultValue: 'Article not found' }) })
      return
    }
    const now = new Date()
    const wasPublished = article.status === 'published'
    const willPublish = body.data.status === 'published'
    // Snapshot the previous state for version history when body changes.
    if (body.data.body_md !== undefined || body.data.body_html !== undefined) {
      await create<ArticleVersionRow>('article_versions', {
        article_id: article.id,
        edited_by_user_id: uid,
        body_md: article.body_md,
        body_html: article.body_html,
        change_summary: body.data.change_summary ?? '',
        edited_at: now,
      })
    }
    const updates = { ...body.data }
    delete (updates as { change_summary?: string }).change_summary
    // Sanitize client-supplied HTML at the trust boundary before storing —
    // it is later rendered to other space members via dangerouslySetInnerHTML.
    if (typeof updates.body_html === 'string') {
      updates.body_html = sanitizeHtml(updates.body_html)
    }
    const result = await updateById<ArticleRow>('articles', id.data.id, {
      ...updates,
      last_edited_by_user_id: uid,
      last_edited_at: now,
      published_at: !wasPublished && willPublish ? now : article.published_at,
      updated_at: now,
    })
    if (!wasPublished && willPublish && result.data) {
      await notifyArticlePublished(result.data as ArticleRow, uid)
    }
    res.json(result.data)
  } catch (error) {
    internalError(res, error)
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  const uid = requireUser(res)
  if (!uid) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    validationError(res, id.error.issues)
    return
  }
  try {
    const article = await requireWritableArticle(id.data.id, uid)
    if (!article) {
      res
        .status(404)
        .json({ error: t('article.notFound', {}, { defaultValue: 'Article not found' }) })
      return
    }
    await deleteById('articles', id.data.id)
    res.status(204).end()
  } catch (error) {
    internalError(res, error)
  }
})

export default router
