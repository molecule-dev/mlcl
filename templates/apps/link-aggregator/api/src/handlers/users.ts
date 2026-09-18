/**
 * Per-app `/users/:id/...` endpoints not covered by the @molecule/api-resource-user
 * resource (which is auth-self only — it can't render someone else's public
 * profile, list someone else's submissions, or persist link-aggregator-specific
 * preferences).
 *
 * The Profile page resolves `:id === 'me'` to the session user before hitting
 * any of these. Public reads (profile / posts / comments) work without
 * authentication; private reads (saved bookmarks) are owner-only.
 *
 * Settings persistence stores into `users.oauthData.preferences` jsonb so we
 * don't need a new column — the user resource already round-trips
 * `oauthData` on update.
 *
 * @module
 */

import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const settingsBodySchema = z
  .object({
    username: z.string().min(1).max(80).optional(),
    email: z.string().email().optional(),
    bio: z.string().max(2_000).optional(),
    feed: z
      .object({
        hideNSFW: z.boolean().optional(),
        collapseDownvoted: z.boolean().optional(),
        defaultSort: z.enum(['hot', 'new', 'top']).optional(),
      })
      .partial()
      .optional(),
    notif: z
      .object({
        replies: z.boolean().optional(),
        mentions: z.boolean().optional(),
        digest: z.boolean().optional(),
      })
      .partial()
      .optional(),
  })
  .partial()

function getSession(res: Response): { userId?: string } | undefined {
  return res.locals.session as { userId?: string } | undefined
}

async function resolveUserId(rawId: string, sessionUserId?: string): Promise<string | null> {
  if (rawId === 'me') return sessionUserId ?? null
  // Accept username as alias — handy for /users/some-username
  if (!/^[0-9a-f-]{36}$/i.test(rawId)) {
    const matches = await findMany<Record<string, unknown>>('users', {
      where: [{ field: 'username', operator: '=', value: rawId }],
      limit: 1,
    })
    if (matches[0]) return String(matches[0].id ?? '')
    return null
  }
  return rawId
}

function publicProfile(user: Record<string, unknown>): Record<string, unknown> {
  return {
    id: user.id,
    username: user.username ?? null,
    karma: user.karma ?? 0,
    bio: user.bio ?? null,
    avatar_url: user.avatar_url ?? null,
    member_since: user.createdAt ?? null,
  }
}

router.get('/:id/profile', async (req: Request, res: Response) => {
  try {
    const sessionUserId = getSession(res)?.userId
    const userId = await resolveUserId(String(req.params.id), sessionUserId)
    if (!userId) {
      res.status(404).json({
        error: t('users.notFound', {}, { defaultValue: 'User not found' }),
      })
      return
    }
    const user = await findById('users', userId)
    if (!user) {
      res.status(404).json({
        error: t('users.notFound', {}, { defaultValue: 'User not found' }),
      })
      return
    }
    const [posts, comments, saved] = await Promise.all([
      findMany('links', {
        where: [{ field: 'submitter_id', operator: '=', value: userId }],
      }),
      findMany('link_comments', {
        where: [{ field: 'author_id', operator: '=', value: userId }],
      }),
      findMany('bookmarks', {
        where: [{ field: 'userId', operator: '=', value: userId }],
      }),
    ])
    res.json({
      data: {
        ...publicProfile(user as Record<string, unknown>),
        post_count: posts.length,
        comment_count: comments.length,
        saved_count: saved.length,
      },
    })
  } catch (error) {
    logger.error('users.getProfile', error)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:id/posts', async (req: Request, res: Response) => {
  try {
    const sessionUserId = getSession(res)?.userId
    const userId = await resolveUserId(String(req.params.id), sessionUserId)
    if (!userId) {
      res.json({ data: [] })
      return
    }
    const data = await findMany('links', {
      where: [{ field: 'submitter_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json({ data })
  } catch (error) {
    logger.error('users.getPosts', error)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:id/comments', async (req: Request, res: Response) => {
  try {
    const sessionUserId = getSession(res)?.userId
    const userId = await resolveUserId(String(req.params.id), sessionUserId)
    if (!userId) {
      res.json({ data: [] })
      return
    }
    const data = await findMany('link_comments', {
      where: [{ field: 'author_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json({ data })
  } catch (error) {
    logger.error('users.getComments', error)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:id/saved', async (req: Request, res: Response) => {
  try {
    const sessionUserId = getSession(res)?.userId
    if (!sessionUserId) {
      res.status(401).json({
        error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }),
      })
      return
    }
    const userId = await resolveUserId(String(req.params.id), sessionUserId)
    if (!userId || userId !== sessionUserId) {
      res.status(403).json({
        error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }),
      })
      return
    }
    const bookmarks = await findMany<Record<string, unknown>>('bookmarks', {
      where: [{ field: 'userId', operator: '=', value: userId }],
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
    })
    const linkIds = bookmarks
      .filter((b) => b.resourceType === 'link')
      .map((b) => String(b.resourceId))
    if (linkIds.length === 0) {
      res.json({ data: [] })
      return
    }
    const links = await findMany<Record<string, unknown>>('links', {
      where: [{ field: 'id', operator: 'in', value: linkIds }],
    })
    const linkById = new Map<string, Record<string, unknown>>()
    for (const link of links) linkById.set(String(link.id), link)
    const data = bookmarks
      .map((b) => linkById.get(String(b.resourceId)))
      .filter((l): l is Record<string, unknown> => Boolean(l))
      .map((l) => ({ ...l, saved: true }))
    res.json({ data })
  } catch (error) {
    logger.error('users.getSaved', error)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/me/settings', async (_req: Request, res: Response) => {
  try {
    const userId = getSession(res)?.userId
    if (!userId) {
      res.status(401).json({
        error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }),
      })
      return
    }
    const user = await findById('users', userId)
    if (!user) {
      res.status(404).json({
        error: t('users.notFound', {}, { defaultValue: 'User not found' }),
      })
      return
    }
    const oauthData = (user.oauthData as Record<string, unknown> | null) ?? {}
    const preferences = (oauthData.preferences as Record<string, unknown> | undefined) ?? {}
    res.json({
      data: {
        username: user.username ?? null,
        email: user.email ?? null,
        bio: user.bio ?? null,
        feed: preferences.feed ?? {
          hideNSFW: true,
          collapseDownvoted: false,
          defaultSort: 'hot',
        },
        notif: preferences.notif ?? {
          replies: true,
          mentions: true,
          digest: false,
        },
      },
    })
  } catch (error) {
    logger.error('users.getSettings', error)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.put(
  '/me/settings',
  validateBody(settingsBodySchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getSession(res)?.userId
      if (!userId) {
        res.status(401).json({
          error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }),
        })
        return
      }
      const incoming = req.body as z.infer<typeof settingsBodySchema>
      const user = await findById('users', userId)
      if (!user) {
        res.status(404).json({
          error: t('users.notFound', {}, { defaultValue: 'User not found' }),
        })
        return
      }
      const oauthData = ((user.oauthData as Record<string, unknown> | null) ?? {}) as Record<
        string,
        unknown
      >
      const previousPrefs = (oauthData.preferences as Record<string, unknown> | undefined) ?? {}
      const nextPrefs = {
        ...previousPrefs,
        ...(incoming.feed
          ? { feed: { ...((previousPrefs.feed as object | undefined) ?? {}), ...incoming.feed } }
          : {}),
        ...(incoming.notif
          ? { notif: { ...((previousPrefs.notif as object | undefined) ?? {}), ...incoming.notif } }
          : {}),
      }
      const updates: Record<string, unknown> = {
        oauthData: { ...oauthData, preferences: nextPrefs },
      }
      if (incoming.username !== undefined) updates.username = incoming.username
      if (incoming.email !== undefined) updates.email = incoming.email
      if (incoming.bio !== undefined) updates.bio = incoming.bio
      await updateById('users', userId, updates)
      const refreshed = await findById('users', userId)
      const refreshedOauthData = (refreshed?.oauthData as Record<string, unknown> | null) ?? {}
      res.json({
        data: {
          username: refreshed?.username ?? null,
          email: refreshed?.email ?? null,
          bio: refreshed?.bio ?? null,
          feed:
            (refreshedOauthData.preferences as Record<string, unknown> | undefined)?.feed ??
            nextPrefs.feed,
          notif:
            (refreshedOauthData.preferences as Record<string, unknown> | undefined)?.notif ??
            nextPrefs.notif,
        },
      })
    } catch (error) {
      logger.error('users.updateSettings', error)
      res.status(500).json({
        error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

export default router
