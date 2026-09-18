import type { NextFunction, Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import {
  count,
  create,
  deleteById,
  findById,
  findMany,
  findOne,
  updateById,
} from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

async function isModerator(res: Response): Promise<boolean> {
  const userId = getUserId(res)
  if (!userId) return false
  const user = (await findById('users', userId)) as { role?: string } | null
  const role = user?.role ?? 'member'
  return role === 'moderator' || role === 'admin'
}

// ---- Topic / Thread enrichment -----------------------------------------

interface TopicRow {
  id: string
  slug?: string
  title: string
  body_markdown?: string
  category_id: string
  author_id: string
  status: string
  is_pinned: boolean
  view_count: number
  post_count: number
  last_reply_at: string
  created_at: string
}

interface UserRow {
  id: string
  username?: string
  name?: string
  reputation?: number
  role?: string
  bio?: string
  avatar_url?: string
}

interface CategoryRow {
  id: string
  slug: string
  name: string
  color?: string
}

async function loadAuthorMap(authorIds: string[]): Promise<Map<string, UserRow>> {
  const map = new Map<string, UserRow>()
  if (!authorIds.length) return map
  const rows = (await findMany('users', {
    where: [{ field: 'id', operator: 'in', value: authorIds }],
    limit: authorIds.length,
  })) as UserRow[]
  for (const r of rows) map.set(r.id, r)
  return map
}

async function loadCategoryMap(categoryIds: string[]): Promise<Map<string, CategoryRow>> {
  const map = new Map<string, CategoryRow>()
  if (!categoryIds.length) return map
  const rows = (await findMany('categories', {
    where: [{ field: 'id', operator: 'in', value: categoryIds }],
    limit: categoryIds.length,
  })) as CategoryRow[]
  for (const r of rows) map.set(r.id, r)
  return map
}

function authorView(author?: UserRow): { username: string; reputation?: number; role?: string } {
  if (!author) return { username: 'unknown' }
  return {
    username: author.username ?? author.name ?? 'user',
    reputation: author.reputation ?? 0,
    role: author.role ?? 'member',
  }
}

function categoryView(
  category?: CategoryRow,
): { name: string; slug: string; color?: string } | undefined {
  if (!category) return undefined
  return { name: category.name, slug: category.slug, color: category.color }
}

function statusToFlags(row: TopicRow): {
  pinned?: boolean
  locked?: boolean
  resolved?: boolean
  hot?: boolean
} {
  return {
    pinned: row.is_pinned || undefined,
    locked: row.status === 'closed' || row.status === 'archived' || undefined,
    resolved: row.status === 'solved' || undefined,
    hot: undefined,
  }
}

function statusLabels(row: TopicRow): string[] {
  const out: string[] = []
  if (row.is_pinned) out.push('pinned')
  if (row.status === 'closed' || row.status === 'archived') out.push('locked')
  if (row.status === 'solved') out.push('resolved')
  return out
}

async function enrichTopics(rows: TopicRow[]): Promise<Array<Record<string, unknown>>> {
  const authorIds = Array.from(new Set(rows.map((r) => r.author_id)))
  const categoryIds = Array.from(new Set(rows.map((r) => r.category_id)))
  const [authorMap, categoryMap] = await Promise.all([
    loadAuthorMap(authorIds),
    loadCategoryMap(categoryIds),
  ])
  return rows.map((r) => {
    const author = authorMap.get(r.author_id)
    const category = categoryMap.get(r.category_id)
    return {
      id: r.id,
      slug: r.slug,
      title: r.title,
      excerpt: (r.body_markdown ?? '').replace(/[#>*`]/g, '').slice(0, 240),
      author: authorView(author),
      category: categoryView(category),
      reply_count: r.post_count ?? 0,
      view_count: r.view_count ?? 0,
      last_activity_at: r.last_reply_at ?? r.created_at,
      statuses: statusLabels(r),
      // `votes` deliberately omitted — there is no voting backend, and the
      // ThreadRow vote column only renders when a numeric value is present.
    }
  })
}

// ---- Threads (alias for topics with enrichment) -----------------------

const listThreadsQuerySchema = z.object({
  category_id: z.string().optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
})

router.get('/threads', validateQuery(listThreadsQuerySchema), async (req, res) => {
  const { category_id, q, page, limit } = req.query as unknown as z.infer<
    typeof listThreadsQuerySchema
  >
  const where: WhereCondition[] = []
  if (category_id) where.push({ field: 'category_id', operator: '=', value: category_id })
  if (q && q.trim()) where.push({ field: 'title', operator: 'ilike', value: q })
  const rows = (await findMany('topics', {
    where: where.length ? where : undefined,
    limit,
    offset: (page - 1) * limit,
    orderBy: [
      { field: 'is_pinned', direction: 'desc' },
      { field: 'last_reply_at', direction: 'desc' },
      { field: 'created_at', direction: 'desc' },
    ],
  })) as TopicRow[]
  const total = await count('topics', where)
  const data = await enrichTopics(rows)
  res.json({ data, total, page, limit })
})

// Threads-by-category convenience route used by the CategoryDetail page.
router.get('/categories/:slug/threads', async (req, res) => {
  const slug = req.params.slug as string
  const cat = (await findOne('categories', [
    { field: 'slug', operator: '=', value: slug },
  ])) as CategoryRow | null
  if (!cat) {
    res
      .status(404)
      .json({ error: t('categories.notFound', {}, { defaultValue: 'Category not found' }) })
    return
  }
  const limit = 50
  const rows = (await findMany('topics', {
    where: [{ field: 'category_id', operator: '=', value: cat.id }],
    limit,
    orderBy: [
      { field: 'is_pinned', direction: 'desc' },
      { field: 'last_reply_at', direction: 'desc' },
      { field: 'created_at', direction: 'desc' },
    ],
  })) as TopicRow[]
  const data = await enrichTopics(rows)
  res.json({ data, total: data.length, page: 1, limit })
})

// Categories with live counts (thread_count, post_count) used by the
// CategoriesList page so cards render real numbers instead of relying on
// the persisted thread_count column (which doesn't track post_count at all).
router.get('/categories-rich', async (_req, res) => {
  const cats = (await findMany('categories', {
    limit: 200,
    orderBy: [{ field: 'sort_order', direction: 'asc' }],
  })) as CategoryRow[]
  if (cats.length === 0) {
    res.json([])
    return
  }
  const topics = (await findMany('topics', {
    where: [{ field: 'category_id', operator: 'in', value: cats.map((c) => c.id) }],
    limit: 5000,
  })) as Array<{
    category_id: string
    post_count?: number
    last_reply_at?: string
    created_at?: string
    title?: string
  }>
  const counts = new Map<
    string,
    { thread: number; post: number; lastAt?: string; lastTitle?: string }
  >()
  for (const c of cats) counts.set(c.id, { thread: 0, post: 0 })
  for (const t of topics) {
    const e = counts.get(t.category_id)
    if (!e) continue
    e.thread += 1
    e.post += t.post_count ?? 0
    const ts = t.last_reply_at ?? t.created_at
    if (ts && (!e.lastAt || ts > e.lastAt)) {
      e.lastAt = ts
      e.lastTitle = t.title
    }
  }
  res.json(
    cats.map((c) => {
      const e = counts.get(c.id)!
      return {
        ...c,
        thread_count: e.thread,
        post_count: e.post,
        last_activity_at: e.lastAt,
        last_thread_title: e.lastTitle,
      }
    }),
  )
})

// Category by slug — supports the frontend's /categories/:slug pattern.
router.get('/categories-by-slug/:slug', async (req, res) => {
  const slug = req.params.slug as string
  const cat = (await findOne('categories', [
    { field: 'slug', operator: '=', value: slug },
  ])) as CategoryRow | null
  if (!cat) {
    res
      .status(404)
      .json({ error: t('categories.notFound', {}, { defaultValue: 'Category not found' }) })
    return
  }
  // Add live counts.
  const [threadCount, postCount] = await Promise.all([
    count('topics', [{ field: 'category_id', operator: '=', value: cat.id }]),
    findMany('topics', {
      where: [{ field: 'category_id', operator: '=', value: cat.id }],
      limit: 1000,
    }).then((rows) =>
      (rows as Array<{ post_count?: number }>).reduce((sum, r) => sum + (r.post_count ?? 0), 0),
    ),
  ])
  res.json({ ...cat, thread_count: threadCount, post_count: postCount })
})

// ---- Single thread (with posts) ---------------------------------------

router.get('/threads/:id', async (req, res) => {
  const idOrSlug = req.params.id as string
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug)
  let topic: TopicRow | null = null
  if (isUuid) {
    topic = (await findById('topics', idOrSlug)) as TopicRow | null
  }
  if (!topic) {
    topic = (await findOne('topics', [
      { field: 'slug', operator: '=', value: idOrSlug },
    ])) as TopicRow | null
  }
  if (!topic) {
    res.status(404).json({ error: t('topics.notFound', {}, { defaultValue: 'Thread not found' }) })
    return
  }
  const id = topic.id
  // Increment view count best-effort (publicly readable).
  try {
    await updateById('topics', id, { view_count: (topic.view_count ?? 0) + 1 })
  } catch (_error) {
    /* best-effort view count increment; read response is unaffected */
  }
  const [postsRaw, category] = await Promise.all([
    findMany('posts', {
      where: [{ field: 'topic_id', operator: '=', value: id }],
      orderBy: [{ field: 'created_at', direction: 'asc' }],
      limit: 500,
    }),
    findById('categories', topic.category_id),
  ])
  // Original post is the topic body itself; subsequent posts are replies.
  const posts = postsRaw as Array<{
    id: string
    body_markdown: string
    author_id: string
    is_solution: boolean
    created_at: string
    edited_at?: string
  }>

  // Build the OP as a synthetic post from the topic itself + real reply posts.
  const opAuthorIds = [topic.author_id, ...posts.map((p) => p.author_id)]
  const authorMap = await loadAuthorMap(Array.from(new Set(opAuthorIds)))

  const opAuthor = authorMap.get(topic.author_id)
  const cat = category as CategoryRow | null
  const allPosts = [
    {
      id: `op-${topic.id}`,
      body: topic.body_markdown ?? '',
      created_at: topic.created_at,
      upvotes: 0,
      author: opAuthor
        ? {
            username: opAuthor.username ?? opAuthor.name ?? 'user',
            display_name: opAuthor.name,
            reputation: opAuthor.reputation ?? 0,
            role: opAuthor.role,
          }
        : { username: 'user', reputation: 0 },
    },
    ...posts.map((p) => {
      const a = authorMap.get(p.author_id)
      return {
        id: p.id,
        body: p.body_markdown,
        created_at: p.created_at,
        edited_at: p.edited_at,
        upvotes: 0,
        is_solution: p.is_solution,
        author: a
          ? {
              username: a.username ?? a.name ?? 'user',
              display_name: a.name,
              reputation: a.reputation ?? 0,
              role: a.role,
            }
          : { username: 'user', reputation: 0 },
      }
    }),
  ]

  const data = {
    id: topic.id,
    slug: topic.slug,
    title: topic.title,
    category: cat ? { name: cat.name, slug: cat.slug, color: cat.color } : { name: '', slug: '' },
    status: statusToFlags(topic),
    posts: allPosts,
    reply_count: posts.length,
    view_count: (topic.view_count ?? 0) + 1,
    participant_count: new Set([topic.author_id, ...posts.map((p) => p.author_id)]).size,
    last_activity_at: topic.last_reply_at ?? topic.created_at,
  }
  res.json({ data })
})

// Frontend POSTs threads as { title, body, categoryId } to /threads.
const createThreadSchema = z.object({
  title: z.string().min(1).max(500),
  body: z.string().min(1).max(50000),
  categoryId: z.string().min(1),
})

function generateSlug(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80) +
    '-' +
    Math.random().toString(36).slice(2, 8)
  )
}

router.post('/threads', validateBody(createThreadSchema), async (req, res) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const body = req.body as z.infer<typeof createThreadSchema>
  const slug = generateSlug(body.title)
  const now = new Date().toISOString()
  const result = await create('topics', {
    title: body.title,
    slug,
    body_markdown: body.body,
    category_id: body.categoryId,
    author_id: userId,
    status: 'open',
    is_pinned: false,
    view_count: 0,
    post_count: 0,
    last_reply_at: now,
    last_reply_user_id: userId,
    created_at: now,
    updated_at: now,
  })
  // Bump thread count on the category.
  const cat = (await findById('categories', body.categoryId)) as { thread_count?: number } | null
  if (cat) {
    await updateById('categories', body.categoryId, {
      thread_count: (cat.thread_count ?? 0) + 1,
      updated_at: now,
    })
  }
  res.status(201).json({ data: result.data })
})

// Reply to a thread.
const createReplySchema = z.object({
  body: z.string().min(1).max(50000),
})

router.post('/threads/:id/posts', validateBody(createReplySchema), async (req, res) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const topicId = await resolveTopicId(req.params.id as string)
  if (!topicId) {
    res.status(404).json({ error: t('topics.notFound', {}, { defaultValue: 'Thread not found' }) })
    return
  }
  const topic = (await findById('topics', topicId)) as TopicRow | null
  if (!topic) {
    res.status(404).json({ error: t('topics.notFound', {}, { defaultValue: 'Thread not found' }) })
    return
  }
  if (topic.status === 'closed' || topic.status === 'archived') {
    res
      .status(403)
      .json({ error: t('posts.topicClosed', {}, { defaultValue: 'Thread is closed' }) })
    return
  }
  const { body } = req.body as z.infer<typeof createReplySchema>
  const now = new Date().toISOString()
  const result = await create('posts', {
    topic_id: topicId,
    author_id: userId,
    body_markdown: body,
    parent_post_id: null,
    is_solution: false,
    created_at: now,
    updated_at: now,
  })
  await updateById('topics', topicId, {
    post_count: (topic.post_count ?? 0) + 1,
    last_reply_at: now,
    last_reply_user_id: userId,
    updated_at: now,
  })
  // Activity row so the thread author gets a notification.
  await create('activities', {
    actorId: userId,
    action: 'reply',
    resourceType: 'topic',
    resourceId: topicId,
    metadata: { topicId, postId: (result.data as { id?: string } | null)?.id ?? null },
    createdAt: now,
  })
  res.status(201).json({ data: result.data })
})

// ---- Search alias ------------------------------------------------------

const searchQuerySchema = z.object({
  q: z.string().optional(),
  type: z.enum(['all', 'threads', 'posts', 'users']).default('all'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
})

router.get('/search', validateQuery(searchQuerySchema), async (req, res) => {
  const { q, type, page, limit } = req.query as unknown as z.infer<typeof searchQuerySchema>
  if (!q || !q.trim()) {
    res.json({ data: [], total: 0, page, limit })
    return
  }
  const term = q.trim().replace(/^@/, '')
  const data: Array<Record<string, unknown>> = []

  // Threads — match topic titles.
  if (type === 'all' || type === 'threads') {
    const rows = (await findMany('topics', {
      where: [{ field: 'title', operator: 'ilike', value: term }],
      limit,
      offset: (page - 1) * limit,
      orderBy: [{ field: 'last_reply_at', direction: 'desc' }],
    })) as TopicRow[]
    data.push(...(await enrichTopics(rows)).map((r) => ({ ...r, kind: 'thread' })))
  }

  // Posts — match reply bodies; each hit surfaces its parent thread with the
  // matching reply text as the excerpt (linking lands on the thread).
  if (type === 'all' || type === 'posts') {
    const posts = (await findMany('posts', {
      where: [{ field: 'body_markdown', operator: 'ilike', value: term }],
      limit,
      offset: (page - 1) * limit,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })) as Array<{ id: string; topic_id: string; body_markdown: string; created_at: string }>
    const topicIds = Array.from(new Set(posts.map((p) => p.topic_id)))
    const topicMap = new Map<string, Record<string, unknown>>()
    if (topicIds.length) {
      const rows = (await findMany('topics', {
        where: [{ field: 'id', operator: 'in', value: topicIds }],
        limit: topicIds.length,
      })) as TopicRow[]
      for (const enriched of await enrichTopics(rows)) {
        topicMap.set(enriched.id as string, enriched)
      }
    }
    for (const p of posts) {
      const thread = topicMap.get(p.topic_id)
      if (!thread) continue
      data.push({
        ...thread,
        id: `post-${p.id}`,
        kind: 'post',
        excerpt: p.body_markdown.replace(/[#>*`]/g, '').slice(0, 240),
        last_activity_at: p.created_at,
      })
    }
  }

  // People — match usernames and display names.
  if (type === 'all' || type === 'users') {
    const [byUsername, byName] = await Promise.all([
      findMany('users', {
        where: [{ field: 'username', operator: 'ilike', value: term }],
        limit,
      }) as Promise<UserRow[]>,
      findMany('users', {
        where: [{ field: 'name', operator: 'ilike', value: term }],
        limit,
      }) as Promise<UserRow[]>,
    ])
    const seen = new Set<string>()
    for (const u of [...byUsername, ...byName]) {
      if (seen.has(u.id)) continue
      seen.add(u.id)
      data.push({
        id: u.id,
        kind: 'user',
        title: u.name ?? u.username ?? 'user',
        excerpt: u.bio ?? '',
        author: authorView(u),
      })
    }
  }

  res.json({ data, total: data.length, page, limit })
})

// ---- Moderation queue alias -------------------------------------------

router.get('/moderation/queue', async (_req, res) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  if (!(await isModerator(res))) {
    res.status(403).json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
    return
  }
  const reports = (await findMany('moderation_reports', {
    where: [{ field: 'status', operator: '=', value: 'pending' }],
    orderBy: [{ field: 'created_at', direction: 'desc' }],
    limit: 100,
  })) as Array<{
    id: string
    target_type: string
    target_id: string
    reason: string
    description?: string
    reporter_id: string
    created_at: string
  }>
  // Enrich with the reported topic title and reporter username.
  const reporterMap = await loadAuthorMap(Array.from(new Set(reports.map((r) => r.reporter_id))))
  const topicIds = reports.filter((r) => r.target_type === 'topic').map((r) => r.target_id)
  const topicMap = new Map<string, TopicRow>()
  if (topicIds.length) {
    const rows = (await findMany('topics', {
      where: [{ field: 'id', operator: 'in', value: topicIds }],
      limit: topicIds.length,
    })) as TopicRow[]
    for (const r of rows) topicMap.set(r.id, r)
  }

  const items = reports.map((r) => {
    const reporter = reporterMap.get(r.reporter_id)
    const topic = r.target_type === 'topic' ? topicMap.get(r.target_id) : undefined
    return {
      id: r.id,
      kind: r.target_type === 'topic' ? 'flagged-post' : 'flagged-post',
      title: topic?.title ?? `${r.target_type} flagged`,
      excerpt: r.description || r.reason,
      reason: r.reason,
      reporter: reporter ? { username: reporter.username ?? reporter.name ?? 'user' } : undefined,
      thread: topic ? { id: topic.id, slug: topic.slug, title: topic.title } : undefined,
      flag_count: 1,
      flagged_at: r.created_at,
    }
  })
  res.json({ data: items })
})

const moderationActionSchema = z.object({
  note: z.string().max(2000).optional(),
})

router.post(
  '/moderation/:id/:action',
  validateBody(moderationActionSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    void next
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    if (!(await isModerator(res))) {
      res.status(403).json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
      return
    }
    const { id, action } = req.params as { id: string; action: string }
    const report = (await findById('moderation_reports', id)) as {
      target_type: string
      target_id: string
    } | null
    if (!report) {
      res
        .status(404)
        .json({ error: t('moderation.notFound', {}, { defaultValue: 'Report not found' }) })
      return
    }

    const now = new Date().toISOString()

    // Apply the moderation action to the underlying resource where applicable.
    if (action === 'lock' && report.target_type === 'topic') {
      await updateById('topics', report.target_id, { status: 'closed', updated_at: now })
    } else if (action === 'hide' && report.target_type === 'post') {
      await updateById('posts', report.target_id, {
        body_markdown: '[hidden by moderator]',
        updated_at: now,
      })
    } else if (action === 'ban') {
      // No ban infrastructure in baseline schema yet; mark report resolved.
    }

    // Resolve the report itself.
    const newStatus = action === 'approve' ? 'rejected' : 'accepted'
    const result = await updateById('moderation_reports', id, {
      status: newStatus,
      resolver_id: userId,
      resolved_at: now,
      updated_at: now,
    })
    res.json({ data: result.data, action })
  },
)

// ---- Users me (alias for /users/:currentUserId) ------------------------

router.get('/users/me', async (_req, res) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const user = (await findById('users', userId)) as Record<string, unknown> | null
  if (!user) {
    res.status(404).json({ error: t('user.notFound', {}, { defaultValue: 'User not found' }) })
    return
  }
  res.json({ props: user })
})

router.patch('/users/me', async (req, res) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const allowed: Record<string, unknown> = {}
  const body = (req.body ?? {}) as Record<string, unknown>
  if (typeof body.name === 'string') allowed.name = body.name.slice(0, 255)
  if (typeof body.email === 'string') allowed.email = body.email.slice(0, 1023)
  if (typeof body.username === 'string')
    allowed.username = body.username.replace(/[^a-zA-Z0-9]/g, '').slice(0, 255)
  if (typeof body.bio === 'string') allowed.bio = body.bio.slice(0, 4000)
  if (typeof body.twoFactorEnabled === 'boolean') allowed.twoFactorEnabled = body.twoFactorEnabled
  if (Object.keys(allowed).length === 0) {
    res.status(400).json({
      error: t('user.error.noUpdatableFields', undefined, {
        defaultValue: 'No updatable fields were provided.',
      }),
    })
    return
  }
  allowed.updatedAt = new Date().toISOString()
  const result = await updateById('users', userId, allowed)
  res.json({ props: result.data })
})

// ---- Users by username ------------------------------------------------

router.get('/users/by-username/:username', async (req, res) => {
  const usernameRaw = req.params.username as string
  const username = usernameRaw.replace(/^@/, '')
  let user = (await findOne('users', [
    { field: 'username', operator: '=', value: username },
  ])) as UserRow | null
  if (!user) {
    user = (await findOne('users', [
      { field: 'name', operator: 'ilike', value: username },
    ])) as UserRow | null
  }
  if (!user) {
    res.status(404).json({ error: t('user.notFound', {}, { defaultValue: 'User not found' }) })
    return
  }
  // Author stats: thread/post/solution counts, follower graph + recent threads.
  const viewerId = getUserId(res)
  const [threadsList, postCount, threadCount, followersCount, solutionsCount, viewerFollow] =
    await Promise.all([
      findMany('topics', {
        where: [{ field: 'author_id', operator: '=', value: user.id }],
        orderBy: [{ field: 'created_at', direction: 'desc' }],
        limit: 10,
      }),
      count('posts', [{ field: 'author_id', operator: '=', value: user.id }]),
      count('topics', [{ field: 'author_id', operator: '=', value: user.id }]),
      count('follows', [
        { field: 'targetType', operator: '=', value: 'user' },
        { field: 'targetId', operator: '=', value: user.id },
      ]),
      // Accepted-answer count — parallels the sibling live counts above; was hardcoded 0 below.
      count('posts', [
        { field: 'author_id', operator: '=', value: user.id },
        { field: 'is_solution', operator: '=', value: true },
      ]),
      viewerId
        ? (findOne('follows', [
            { field: 'followerId', operator: '=', value: viewerId },
            { field: 'targetType', operator: '=', value: 'user' },
            { field: 'targetId', operator: '=', value: user.id },
          ]) as Promise<{ id: string } | null>)
        : Promise.resolve(null),
    ])
  const recentTopics = threadsList as unknown as TopicRow[]
  const categoryMap = await loadCategoryMap(
    Array.from(new Set(recentTopics.map((t) => t.category_id))),
  )

  res.json({
    data: {
      id: user.id,
      username: user.username ?? user.name ?? 'user',
      display_name: user.name ?? user.username ?? 'User',
      bio: user.bio ?? '',
      joined_at: (user as unknown as { createdAt?: string }).createdAt ?? new Date().toISOString(),
      reputation: user.reputation ?? 0,
      post_count: postCount,
      thread_count: threadCount,
      solutions_count: solutionsCount,
      followers_count: followersCount,
      viewer_following: !!viewerFollow,
      badges: [],
      recent_threads: recentTopics.map((r) => {
        const c = categoryMap.get(r.category_id)
        return {
          id: r.id,
          slug: r.slug,
          title: r.title,
          excerpt: (r.body_markdown ?? '').replace(/[#>*`]/g, '').slice(0, 200),
          category: c ? { name: c.name, slug: c.slug, color: c.color } : undefined,
          reply_count: r.post_count ?? 0,
          view_count: r.view_count ?? 0,
          last_activity_at: r.last_reply_at ?? r.created_at,
          statuses: statusLabels(r),
        }
      }),
    },
  })
})

// ---- Follow / unfollow a member (used by UserProfile) -------------------

router.post('/users/:id/follow', async (req, res) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const targetId = req.params.id as string
  if (targetId === userId) {
    res.status(400).json({
      error: t('users.cannotFollowSelf', {}, { defaultValue: 'You cannot follow yourself' }),
    })
    return
  }
  const target = (await findById('users', targetId)) as { id: string } | null
  if (!target) {
    res.status(404).json({ error: t('user.notFound', {}, { defaultValue: 'User not found' }) })
    return
  }
  const existing = (await findOne('follows', [
    { field: 'followerId', operator: '=', value: userId },
    { field: 'targetType', operator: '=', value: 'user' },
    { field: 'targetId', operator: '=', value: targetId },
  ])) as { id: string } | null
  if (existing) {
    res.json({ data: existing, following: true })
    return
  }
  const now = new Date().toISOString()
  const result = await create('follows', {
    followerId: userId,
    targetType: 'user',
    targetId,
    createdAt: now,
    updatedAt: now,
  })
  res.status(201).json({ data: result.data, following: true })
})

router.delete('/users/:id/follow', async (req, res) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const existing = (await findOne('follows', [
    { field: 'followerId', operator: '=', value: userId },
    { field: 'targetType', operator: '=', value: 'user' },
    { field: 'targetId', operator: '=', value: req.params.id as string },
  ])) as { id: string } | null
  if (existing) {
    await deleteById('follows', existing.id)
  }
  res.status(204).end()
})

// Close a thread (author or moderator).
router.post('/threads/:id/close', async (req, res) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const id = await resolveTopicId(req.params.id as string)
  if (!id) {
    res.status(404).json({ error: t('topics.notFound', {}, { defaultValue: 'Thread not found' }) })
    return
  }
  const topic = (await findById('topics', id)) as TopicRow | null
  if (!topic) {
    res.status(404).json({ error: t('topics.notFound', {}, { defaultValue: 'Thread not found' }) })
    return
  }
  const isAuthor = topic.author_id === userId
  const isMod = await isModerator(res)
  if (!isAuthor && !isMod) {
    res.status(403).json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
    return
  }
  const result = await updateById('topics', id, {
    status: 'closed',
    updated_at: new Date().toISOString(),
  })
  res.json({ data: result.data })
})

router.post('/threads/:id/reopen', async (req, res) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const id = await resolveTopicId(req.params.id as string)
  if (!id) {
    res.status(404).json({ error: t('topics.notFound', {}, { defaultValue: 'Thread not found' }) })
    return
  }
  const topic = (await findById('topics', id)) as TopicRow | null
  if (!topic) {
    res.status(404).json({ error: t('topics.notFound', {}, { defaultValue: 'Thread not found' }) })
    return
  }
  const isAuthor = topic.author_id === userId
  const isMod = await isModerator(res)
  if (!isAuthor && !isMod) {
    res.status(403).json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
    return
  }
  const result = await updateById('topics', id, {
    status: 'open',
    updated_at: new Date().toISOString(),
  })
  res.json({ data: result.data })
})

// Toggle bookmark on a thread (used by ThreadView). POST to add, DELETE to remove.
async function resolveTopicId(idOrSlug: string): Promise<string | null> {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug)
  if (isUuid) return idOrSlug
  const topic = (await findOne('topics', [{ field: 'slug', operator: '=', value: idOrSlug }])) as {
    id: string
  } | null
  return topic?.id ?? null
}

router.post('/threads/:id/bookmark', async (req, res) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const id = await resolveTopicId(req.params.id as string)
  if (!id) {
    res.status(404).json({ error: t('topics.notFound', {}, { defaultValue: 'Thread not found' }) })
    return
  }
  const existing = (await findOne('bookmarks', [
    { field: 'user_id', operator: '=', value: userId },
    { field: 'target_type', operator: '=', value: 'topic' },
    { field: 'target_id', operator: '=', value: id },
  ])) as { id: string } | null
  if (existing) {
    res.json({ data: existing, bookmarked: true })
    return
  }
  const now = new Date().toISOString()
  const result = await create('bookmarks', {
    user_id: userId,
    target_type: 'topic',
    target_id: id,
    created_at: now,
    updated_at: now,
  })
  res.status(201).json({ data: result.data, bookmarked: true })
})

router.delete('/threads/:id/bookmark', async (req, res) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const id = await resolveTopicId(req.params.id as string)
  if (!id) {
    res.status(204).end()
    return
  }
  const existing = (await findOne('bookmarks', [
    { field: 'user_id', operator: '=', value: userId },
    { field: 'target_type', operator: '=', value: 'topic' },
    { field: 'target_id', operator: '=', value: id },
  ])) as { id: string } | null
  if (existing) {
    await deleteById('bookmarks', existing.id)
  }
  res.status(204).end()
})

router.get('/threads/:id/bookmark', async (req, res) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const id = await resolveTopicId(req.params.id as string)
  if (!id) {
    res.json({ bookmarked: false, id: null })
    return
  }
  const existing = (await findOne('bookmarks', [
    { field: 'user_id', operator: '=', value: userId },
    { field: 'target_type', operator: '=', value: 'topic' },
    { field: 'target_id', operator: '=', value: id },
  ])) as { id: string } | null
  res.json({ bookmarked: !!existing, id: existing?.id ?? null })
})

// Bookmarks list with thread enrichment (used by Bookmarks page).
router.get('/bookmarks-rich', async (_req, res) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const bookmarks = (await findMany('bookmarks', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [{ field: 'created_at', direction: 'desc' }],
    limit: 200,
  })) as Array<{ id: string; target_type: string; target_id: string; created_at: string }>

  const topicIds = bookmarks.filter((b) => b.target_type === 'topic').map((b) => b.target_id)
  const topicMap = new Map<string, TopicRow>()
  if (topicIds.length) {
    const rows = (await findMany('topics', {
      where: [{ field: 'id', operator: 'in', value: topicIds }],
      limit: topicIds.length,
    })) as TopicRow[]
    for (const r of rows) topicMap.set(r.id, r)
  }
  const authorIds = Array.from(new Set(Array.from(topicMap.values()).map((t) => t.author_id)))
  const categoryIds = Array.from(new Set(Array.from(topicMap.values()).map((t) => t.category_id)))
  const [authorMap, categoryMap] = await Promise.all([
    loadAuthorMap(authorIds),
    loadCategoryMap(categoryIds),
  ])

  const data = bookmarks
    .map((b) => {
      const topic = topicMap.get(b.target_id)
      if (!topic) return null
      const author = authorMap.get(topic.author_id)
      const category = categoryMap.get(topic.category_id)
      return {
        id: b.id,
        saved_at: b.created_at,
        thread: {
          id: topic.id,
          slug: topic.slug,
          title: topic.title,
          excerpt: (topic.body_markdown ?? '').replace(/[#>*`]/g, '').slice(0, 200),
          author: authorView(author),
          category: categoryView(category),
          reply_count: topic.post_count ?? 0,
          view_count: topic.view_count ?? 0,
          last_activity_at: topic.last_reply_at ?? topic.created_at,
          statuses: statusLabels(topic),
        },
      }
    })
    .filter(Boolean)

  res.json({ data })
})

export default router
