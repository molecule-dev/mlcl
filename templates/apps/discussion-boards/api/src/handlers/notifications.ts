import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { count, create, findMany, findOne, updateMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

// Notifications are derived from the `activities` table where the
// activity targets resources owned by the requesting user (their topics
// or their posts), excluding self-actions. `activity_seen_status` tracks
// the high-water mark for read state.

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(50),
})

interface ActivityRow {
  id: string
  actorId: string
  action: string
  resourceType: string
  resourceId: string
  metadata: Record<string, unknown> | null
  createdAt: string
}

async function loadOwnedResourceIds(userId: string): Promise<{
  topicIds: string[]
  postIds: string[]
}> {
  const topics = await findMany('topics', {
    where: [{ field: 'author_id', operator: '=', value: userId }],
    limit: 500,
  })
  const posts = await findMany('posts', {
    where: [{ field: 'author_id', operator: '=', value: userId }],
    limit: 500,
  })
  return {
    topicIds: (topics as Array<{ id: string }>).map((row) => row.id),
    postIds: (posts as Array<{ id: string }>).map((row) => row.id),
  }
}

async function loadActorMap(
  actorIds: string[],
): Promise<Map<string, { username?: string; name?: string }>> {
  const map = new Map<string, { username?: string; name?: string }>()
  if (!actorIds.length) return map
  const users = await findMany('users', {
    where: [{ field: 'id', operator: 'in', value: actorIds }],
    limit: actorIds.length,
  })
  for (const u of users as Array<{ id: string; username?: string; name?: string }>) {
    map.set(u.id, { username: u.username ?? undefined, name: u.name ?? undefined })
  }
  return map
}

async function loadTopicMap(
  topicIds: string[],
): Promise<Map<string, { id: string; slug?: string; title: string }>> {
  const map = new Map<string, { id: string; slug?: string; title: string }>()
  if (!topicIds.length) return map
  const rows = await findMany('topics', {
    where: [{ field: 'id', operator: 'in', value: topicIds }],
    limit: topicIds.length,
  })
  for (const r of rows as Array<{ id: string; slug?: string; title: string }>) {
    map.set(r.id, { id: r.id, slug: r.slug, title: r.title })
  }
  return map
}

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const { page, limit } = req.query as unknown as z.infer<typeof listQuerySchema>

  const { topicIds, postIds } = await loadOwnedResourceIds(userId)
  const merged: ActivityRow[] = []

  if (topicIds.length) {
    const rows = (await findMany('activities', {
      where: [
        { field: 'actorId', operator: '!=', value: userId },
        { field: 'resourceType', operator: '=', value: 'topic' },
        { field: 'resourceId', operator: 'in', value: topicIds },
      ],
      limit,
      offset: (page - 1) * limit,
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
    })) as ActivityRow[]
    merged.push(...rows)
  }
  if (postIds.length) {
    const rows = (await findMany('activities', {
      where: [
        { field: 'actorId', operator: '!=', value: userId },
        { field: 'resourceType', operator: '=', value: 'post' },
        { field: 'resourceId', operator: 'in', value: postIds },
      ],
      limit,
      offset: (page - 1) * limit,
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
    })) as ActivityRow[]
    merged.push(...rows)
  }

  // Sort newest-first across the merged set, then enforce limit.
  merged.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1))
  const sliced = merged.slice(0, limit)

  const actorIds = Array.from(new Set(sliced.map((a) => a.actorId)))
  const linkedTopicIds = Array.from(
    new Set(
      sliced
        .map((a) =>
          a.resourceType === 'topic' ? a.resourceId : (a.metadata?.topicId as string | undefined),
        )
        .filter(Boolean) as string[],
    ),
  )
  const [actorMap, topicMap, seenStatus] = await Promise.all([
    loadActorMap(actorIds),
    loadTopicMap(linkedTopicIds),
    findOne('activity_seen_status', [
      { field: 'userId', operator: '=', value: userId },
    ]) as Promise<{ updatedAt?: string } | null>,
  ])

  const lastSeenAt = seenStatus?.updatedAt ?? null

  const enriched = sliced.map((a) => {
    const actor = actorMap.get(a.actorId) ?? null
    const topicId =
      a.resourceType === 'topic' ? a.resourceId : (a.metadata?.topicId as string | undefined)
    const topic = topicId ? (topicMap.get(topicId) ?? null) : null
    return {
      id: a.id,
      kind: a.action === 'reply' ? 'reply' : a.action === 'mention' ? 'mention' : a.action,
      actor: actor ? { username: actor.username ?? actor.name ?? 'user' } : undefined,
      thread: topic ? { id: topic.id, slug: topic.slug, title: topic.title } : undefined,
      body:
        a.action === 'reply' ? 'replied to your thread.' : `${a.action} on your ${a.resourceType}`,
      link: topic ? `/t/${topic.id}` : undefined,
      read: lastSeenAt ? a.createdAt <= lastSeenAt : false,
      created_at: a.createdAt,
    }
  })

  res.json({ data: enriched, total: enriched.length, page, limit })
})

router.post('/mark-all-read', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const latest = (await findMany('activities', {
    limit: 1,
    orderBy: [{ field: 'createdAt', direction: 'desc' }],
  })) as Array<{ id: string }>
  if (!latest.length) {
    res.json({ ok: true, lastSeenActivityId: null })
    return
  }
  const lastId = latest[0]!.id
  const existing = (await findOne('activity_seen_status', [
    { field: 'userId', operator: '=', value: userId },
  ])) as { userId: string } | null
  const now = new Date().toISOString()
  if (existing) {
    await updateMany('activity_seen_status', [{ field: 'userId', operator: '=', value: userId }], {
      lastSeenActivityId: lastId,
      updatedAt: now,
    })
  } else {
    await create('activity_seen_status', {
      userId,
      lastSeenActivityId: lastId,
      updatedAt: now,
    })
  }
  res.json({ ok: true, lastSeenActivityId: lastId })
})

router.get('/unread-count', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const seen = (await findOne('activity_seen_status', [
    { field: 'userId', operator: '=', value: userId },
  ])) as { updatedAt?: string } | null
  // Match /notifications scoping: only count activities targeting topics/
  // posts the user owns, excluding their own actions, and newer than the
  // last "mark all as read" timestamp (UUID ids are not chronological — we
  // rely on createdAt for the watermark).
  const { topicIds, postIds } = await loadOwnedResourceIds(userId)
  if (!topicIds.length && !postIds.length) {
    res.json({ count: 0 })
    return
  }
  const lastSeenAt = seen?.updatedAt ?? null
  let total = 0
  if (topicIds.length) {
    const where: WhereCondition[] = [
      { field: 'actorId', operator: '!=', value: userId },
      { field: 'resourceType', operator: '=', value: 'topic' },
      { field: 'resourceId', operator: 'in', value: topicIds },
    ]
    if (lastSeenAt) where.push({ field: 'createdAt', operator: '>', value: lastSeenAt })
    total += await count('activities', where)
  }
  if (postIds.length) {
    const where: WhereCondition[] = [
      { field: 'actorId', operator: '!=', value: userId },
      { field: 'resourceType', operator: '=', value: 'post' },
      { field: 'resourceId', operator: 'in', value: postIds },
    ]
    if (lastSeenAt) where.push({ field: 'createdAt', operator: '>', value: lastSeenAt })
    total += await count('activities', where)
  }
  res.json({ count: total })
})

export default router
