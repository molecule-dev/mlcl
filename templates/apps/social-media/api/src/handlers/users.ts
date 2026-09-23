import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, findOne } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import { enrichPosts, enrichUser } from '../lib/enrich-posts.js'
import { isPostVisibleToViewer } from '../lib/visibility.js'

const profile = Router()
const search = Router()
const saves = Router()

interface RawUser {
  id: string
  username: string | null
  name: string | null
  email: string | null
  oauthData?: { bio?: string | null } | null
}

function sanitizeEmailHandle(email: string | null): string {
  if (!email) return ''
  return email
    .split('@')[0]
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase()
}

async function resolveUserByHandle(
  handle: string,
  viewerId: string | null,
): Promise<RawUser | null> {
  const lower = handle.toLowerCase()
  if (lower === 'me' && viewerId) {
    return await findById<RawUser>('users', viewerId)
  }
  const user = await findOne<RawUser>('users', [{ field: 'username', operator: '=', value: lower }])
  if (user) return user
  // Fall back to scanning for an email whose sanitized local part matches
  // (signup helpers create emails like "sme2e+ts-counter@x" which sanitize
  // to "sme2etscounter"; ilike alone can't undo the dropped + and -).
  const candidates = await findMany<RawUser>('users', { limit: 500 })
  return candidates.find((u) => sanitizeEmailHandle(u.email) === lower) ?? null
}

profile.get('/me', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const user = await findById<RawUser>('users', userId)
    if (!user) {
      return res
        .status(404)
        .json({ error: t('user.notFound', {}, { defaultValue: 'User not found' }) })
    }
    const enriched = await enrichUser(user, userId)
    res.json(enriched)
  } catch (err) {
    logger.error('profile.getMe', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

profile.get('/:handle', async (req: Request, res: Response) => {
  try {
    const viewerId = getUserId(res)
    const user = await resolveUserByHandle(String(req.params.handle), viewerId)
    if (!user) {
      return res
        .status(404)
        .json({ error: t('user.notFound', {}, { defaultValue: 'User not found' }) })
    }
    const enriched = await enrichUser(user, viewerId)
    res.json(enriched)
  } catch (err) {
    logger.error('profile.getUser', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

profile.get('/:handle/posts', async (req: Request, res: Response) => {
  try {
    const viewerId = getUserId(res)
    const user = await resolveUserByHandle(String(req.params.handle), viewerId)
    if (!user) {
      return res
        .status(404)
        .json({ error: t('user.notFound', {}, { defaultValue: 'User not found' }) })
    }
    const limit = Math.min(Number(req.query.limit) || 24, 100)
    const offset = Number(req.query.offset) || 0
    const visibilities = viewerId === user.id ? ['public', 'followers', 'private'] : ['public']
    const posts = await findMany('posts', {
      where: [
        { field: 'user_id', operator: '=', value: user.id },
        { field: 'visibility', operator: 'in', value: visibilities },
      ],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit,
      offset,
    })
    const enriched = await enrichPosts(posts as never[], viewerId)
    res.json(enriched)
  } catch (err) {
    logger.error('profile.getUserPosts', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

search.get('/users', async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q || '')
      .trim()
      .toLowerCase()
    if (q.length < 1) return res.json([])
    const candidates = await findMany<RawUser>('users', { limit: 200 })
    const matched = candidates
      .filter((u) => {
        const handle = (u.username || '').toLowerCase()
        const name = (u.name || '').toLowerCase()
        const email = (u.email || '').toLowerCase()
        return handle.includes(q) || name.includes(q) || email.startsWith(q)
      })
      .slice(0, 20)
      .map((u) => ({
        id: u.id,
        display_name:
          u.name || u.username || (u.email ? u.email.split('@')[0] : `user_${u.id.slice(0, 6)}`),
        handle:
          u.username ||
          (u.email
            ? u.email
                .split('@')[0]
                .replace(/[^a-z0-9]/gi, '')
                .toLowerCase()
            : `user_${u.id.slice(0, 6)}`),
        cover_index: 0,
        is_verified: false,
        bio: '',
      }))
    res.json(matched)
  } catch (err) {
    logger.error('search.users', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

search.get('/posts', async (req: Request, res: Response) => {
  try {
    const viewerId = getUserId(res)
    const q = String(req.query.q || '')
      .trim()
      .toLowerCase()
    if (q.length < 1) return res.json([])
    const candidates = await findMany('posts', {
      where: [{ field: 'visibility', operator: '=', value: 'public' }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 200,
    })
    const matched = (candidates as Array<Record<string, unknown>>)
      .filter((p) => {
        const caption = String(p.caption || '').toLowerCase()
        const tags = Array.isArray(p.hashtags) ? (p.hashtags as string[]) : []
        const location = String(p.location || '').toLowerCase()
        return (
          caption.includes(q) ||
          location.includes(q) ||
          tags.some((tag) => tag.toLowerCase().includes(q))
        )
      })
      .slice(0, 30)
    const enriched = await enrichPosts(matched as never[], viewerId)
    res.json(enriched)
  } catch (err) {
    logger.error('search.posts', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

saves.post('/posts/:id/save', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const postId = String(req.params.id)
    const post = await findById('posts', postId)
    if (!post) {
      return res
        .status(404)
        .json({ error: t('post.notFound', {}, { defaultValue: 'Post not found' }) })
    }
    const existing = await findOne<{ id: string }>('bookmarks', [
      { field: 'userId', operator: '=', value: userId },
      { field: 'resourceType', operator: '=', value: 'post' },
      { field: 'resourceId', operator: '=', value: postId },
    ])
    if (existing) {
      await deleteById('bookmarks', existing.id)
      return res.json({ saved: false })
    }
    await create('bookmarks', {
      userId,
      resourceType: 'post',
      resourceId: postId,
    })
    res.json({ saved: true })
  } catch (err) {
    logger.error('saves.toggleSave', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

saves.get('/saved', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const bookmarks = await findMany<{ resourceId: string }>('bookmarks', {
      where: [
        { field: 'userId', operator: '=', value: userId },
        { field: 'resourceType', operator: '=', value: 'post' },
      ],
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
      limit: 100,
    })
    const ids = bookmarks.map((b) => b.resourceId)
    if (ids.length === 0) return res.json([])
    const saved = await findMany('posts', {
      where: [{ field: 'id', operator: 'in', value: ids }],
      limit: ids.length,
    })
    // Honor post visibility on the bookmarks read like every other post read: return a saved post
    // only if it is public, the viewer authored it, or it is followers-only and the viewer follows
    // the author. Fetched by id, so the gate is applied in JS (see lib/visibility). Without this a
    // followers/private post the viewer had bookmarked would leak back through /saved.
    const follows = await findMany<{ following_id: string }>('user_follows', {
      where: [{ field: 'follower_id', operator: '=', value: userId }],
    })
    const followedIds = new Set(follows.map((f) => f.following_id))
    const visible = saved.filter((p) =>
      isPostVisibleToViewer(
        p as { user_id?: string | null; visibility?: string | null },
        userId,
        followedIds,
      ),
    )
    const enriched = await enrichPosts(visible as never[], userId)
    res.json(enriched)
  } catch (err) {
    logger.error('saves.listSaved', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

export { profile, saves, search }
