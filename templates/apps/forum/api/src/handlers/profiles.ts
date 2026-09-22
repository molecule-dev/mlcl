/**
 * Public profile endpoint — username- or id-keyed, sanitized.
 *
 * Returns a small, public projection of the `users` row plus aggregate
 * counts (post count, comment count, total upvotes received) for the
 * Profile page. Authentication is not required: profile pages are
 * publicly visible.
 *
 * @module
 */

import type { Request, Response } from 'express'
import { Router } from 'express'

import { count, findById, findMany, query, type WhereCondition } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const router = Router()

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface UserRow {
  id: string
  username?: string | null
  name?: string | null
  bio?: string | null
  avatar_url?: string | null
  reputation?: number | null
  role?: string | null
  createdAt?: string | null
}

async function findUserByIdentifier(identifier: string): Promise<UserRow | null> {
  if (UUID_RE.test(identifier)) {
    const direct = (await findById('users', identifier)) as UserRow | null
    if (direct) return direct
  }
  // Username may be a stored value or a derived "id-prefix" (the Profile
  // page falls back to `id.slice(0, 8)` when a user has no username).
  const byUsername = await findMany<UserRow>('users', {
    where: [{ field: 'username', operator: '=', value: identifier }],
    limit: 1,
  })
  if (byUsername.length > 0) return byUsername[0]
  // Match by id-prefix fallback. UUID columns can't use LIKE directly,
  // so cast to text. Use parameterised query to avoid injection.
  const result = await query<UserRow>(
    `SELECT id, username, name, bio, avatar_url, reputation, role, "createdAt"
       FROM users
      WHERE id::text LIKE $1
      LIMIT 1`,
    [`${identifier}%`],
  )
  return (result.rows ?? [])[0] ?? null
}

interface PublicProfile {
  id: string
  username: string | null
  name: string | null
  bio: string | null
  avatar_url: string | null
  reputation: number
  role: string
  joined: string | null
}

function publicProjection(user: UserRow): PublicProfile {
  return {
    id: user.id,
    username: user.username ?? null,
    name: user.name ?? null,
    bio: user.bio ?? null,
    avatar_url: user.avatar_url ?? null,
    reputation: user.reputation ?? 0,
    role: user.role ?? 'member',
    joined: user.createdAt ?? null,
  }
}

router.get('/:identifier', async (req: Request, res: Response) => {
  try {
    const identifier = Array.isArray(req.params.identifier)
      ? req.params.identifier[0]
      : req.params.identifier
    const user = await findUserByIdentifier(identifier)
    if (!user) {
      res.status(404).json({
        error: t('profiles.notFound', {}, { defaultValue: 'User not found' }),
      })
      return
    }
    const where: WhereCondition[] = [{ field: 'author_id', operator: '=', value: user.id }]
    const [postCount, commentCount, recentThreads, recentReplies] = await Promise.all([
      count('threads', where),
      count('replies', where),
      findMany<Record<string, unknown>>('threads', {
        where,
        orderBy: [{ field: 'created_at', direction: 'desc' }],
        limit: 25,
      }),
      findMany<Record<string, unknown>>('replies', {
        where,
        orderBy: [{ field: 'created_at', direction: 'desc' }],
        limit: 25,
      }),
    ])

    // Resolve thread context for each reply so the front-end can link
    // back to the parent discussion without an extra round-trip.
    const replyThreadIds = Array.from(
      new Set(recentReplies.map((r) => String(r.thread_id ?? '')).filter(Boolean)),
    )
    const replyThreads = replyThreadIds.length
      ? await findMany<Record<string, unknown>>('threads', {
          where: [{ field: 'id', operator: 'in', value: replyThreadIds }],
        })
      : []
    const replyThreadById = new Map<string, Record<string, unknown>>()
    for (const th of replyThreads) replyThreadById.set(String(th.id), th)
    const decoratedReplies = recentReplies.map((r) => {
      const th = replyThreadById.get(String(r.thread_id ?? ''))
      return {
        ...r,
        thread: th
          ? { id: th.id, slug: th.slug, title: th.title, category_id: th.category_id }
          : null,
      }
    })

    // Bookmarks are stored generically; filter to thread-typed bookmarks
    // and rehydrate the thread rows the user starred.
    const savedRefs = await findMany<{
      id: string
      resourceType: string
      resourceId: string
      createdAt?: string
    }>('bookmarks', {
      where: [
        { field: 'userId', operator: '=', value: user.id },
        { field: 'resourceType', operator: '=', value: 'thread' },
      ],
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
      limit: 25,
    })
    const savedThreadIds = Array.from(
      new Set(savedRefs.map((b) => String(b.resourceId ?? '')).filter(Boolean)),
    )
    const savedThreads = savedThreadIds.length
      ? await findMany<Record<string, unknown>>('threads', {
          where: [{ field: 'id', operator: 'in', value: savedThreadIds }],
        })
      : []

    const categoryIds = Array.from(
      new Set(
        [...recentThreads, ...savedThreads]
          .map((th) => String(th.category_id ?? ''))
          .filter(Boolean),
      ),
    )
    const cats = categoryIds.length
      ? await findMany<Record<string, unknown>>('forum_categories', {
          where: [{ field: 'id', operator: 'in', value: categoryIds }],
        })
      : []
    const catById = new Map<string, Record<string, unknown>>()
    for (const c of cats) catById.set(String(c.id), c)
    const decoratedThreads = recentThreads.map((th) => {
      const c = catById.get(String(th.category_id ?? ''))
      return {
        ...th,
        category: c
          ? {
              id: c.id,
              slug: c.slug,
              name: c.name,
              color: c.color,
              icon: c.icon,
            }
          : null,
        author: {
          id: user.id,
          username: user.username ?? null,
          name: user.name ?? null,
          role: user.role ?? 'member',
          reputation: user.reputation ?? 0,
          avatar_url: user.avatar_url ?? null,
        },
      }
    })

    const decoratedSavedThreads = savedThreads.map((th) => ({
      ...th,
      category: catById.get(String(th.category_id ?? '')) ?? null,
    }))

    res.json({
      user: publicProjection(user),
      stats: {
        postCount,
        commentCount,
        karma: user.reputation ?? 0,
      },
      recentThreads: decoratedThreads,
      recentReplies: decoratedReplies,
      savedThreads: decoratedSavedThreads,
    })
  } catch (err) {
    logger.error('profiles.get', err)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
