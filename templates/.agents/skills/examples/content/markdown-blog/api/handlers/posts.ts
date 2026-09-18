import type { NextFunction, Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { create, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

const postSchema = z.object({
  title: z.string().min(1).max(300),
  slug: z.string().regex(/^[a-z\d][a-z\d-]*[a-z\d]$/),
  body_markdown: z.string().min(1).max(100_000),
  draft: z.boolean().optional().default(false),
})

// Plain-text preview for the blog index. Store the markdown source, not an
// excerpt column — derive the excerpt at read time so it stays consistent.
// Strips the common markdown markers and truncates.
const EXCERPT_MAX = 200
function toExcerpt(markdown: string): string {
  const plain = markdown
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1') // images/links → their visible text
    .replace(/^\s{0,3}[-+*]\s+/gm, '') // list bullets
    .replace(/[#>*_`~]+/g, '') // heading / quote / emphasis / code markers
    .replace(/\s+/g, ' ')
    .trim()
  return plain.length > EXCERPT_MAX ? `${plain.slice(0, EXCERPT_MAX).trimEnd()}…` : plain
}

const requireAuthor = (_req: Request, res: Response, next: NextFunction): void => {
  if (!res.locals.session?.userId) {
    res
      .status(401)
      .json({ error: t('auth.required', undefined, { defaultValue: 'Authentication required' }) })
    return
  }
  next()
}

const router = Router()

router.get('/', async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100)
  const offset = Number(req.query.offset) || 0
  const posts = await findMany<{
    id: string
    slug: string
    title: string
    body_markdown: string
    published_at: string
  }>('posts', {
    where: [{ field: 'draft', operator: '=', value: false }],
    orderBy: [{ field: 'published_at', direction: 'desc' }],
    limit,
    offset,
    select: ['id', 'slug', 'title', 'body_markdown', 'published_at'],
  })
  // The index shows an excerpt + date, not the full body — derive the excerpt
  // here so the client never parses markdown just to render a list.
  res.json(
    posts.map(({ body_markdown, ...rest }) => ({ ...rest, excerpt: toExcerpt(body_markdown) })),
  )
})

router.get('/:slug', async (req, res) => {
  const [post] = await findMany('posts', {
    where: [{ field: 'slug', operator: '=', value: req.params.slug }],
    limit: 1,
  })
  if (!post || (post as { draft?: boolean }).draft) {
    return res
      .status(404)
      .json({ error: t('posts.notFound', undefined, { defaultValue: 'Post not found' }) })
  }
  res.json(post)
})

router.post('/', requireAuthor, async (req, res) => {
  const parsed = postSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('validation.failed', undefined, { defaultValue: 'Validation failed' }),
      issues: parsed.error.issues,
    })
  }
  const result = await create('posts', {
    ...parsed.data,
    author_id: res.locals.session.userId,
    published_at: parsed.data.draft ? null : new Date().toISOString(),
  })
  res.status(201).json(result.data)
})

router.put('/:id', requireAuthor, async (req, res) => {
  const parsed = postSchema.partial().safeParse(req.body)
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: t('validation.failed', undefined, { defaultValue: 'Validation failed' }) })
  }
  // Owner-scope the write: load the row and 404 unless it belongs to the caller
  // (404 not 403 — don't leak that another author's post exists). An unscoped
  // updateById on a client-supplied id is an IDOR (one author edits another's post).
  const post = await findById<{ author_id?: string; published_at?: string | null }>(
    'posts',
    req.params.id as string,
  )
  if (!post || post.author_id !== res.locals.session.userId) {
    return res
      .status(404)
      .json({ error: t('posts.notFound', undefined, { defaultValue: 'Post not found' }) })
  }
  // Publishing a saved draft (draft → false): stamp published_at the first time
  // it goes public so the blog index date + ordering are correct.
  const updates: Record<string, unknown> = { ...parsed.data }
  if (parsed.data.draft === false && !post.published_at) {
    updates.published_at = new Date().toISOString()
  }
  const result = await updateById('posts', req.params.id as string, updates)
  res.json(result.data)
})

export default router
