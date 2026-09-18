import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

interface UserRow {
  id?: string
  name?: string | null
  email?: string | null
  username?: string | null
  createdAt?: string | Date | null
  oauthData?: Record<string, unknown> | null
}

const updateProfileSchema = z.object({
  display_name: z.string().min(1).max(255).optional(),
  handle: z.string().max(255).nullable().optional(),
  bio: z.string().max(2000).nullable().optional(),
  github: z.string().max(255).nullable().optional(),
  twitter: z.string().max(255).nullable().optional(),
  website: z.string().max(500).nullable().optional(),
  time_zone: z.string().max(100).nullable().optional(),
})

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const user = (await findById<UserRow>('users', userId)) ?? null
    if (!user) return res.status(404).json({ error: t('profile.notFound') })

    // Aggregate request count from try-it history (last 30 days).
    let apiCalls30d = 0
    try {
      const since = new Date()
      since.setDate(since.getDate() - 30)
      const history = await findMany('try_it_history', {
        where: [
          { field: 'user_id', operator: '=', value: userId },
          { field: 'created_at', operator: '>=', value: since },
        ],
      })
      apiCalls30d = history.length
    } catch (_error) {
      // Best-effort aggregation; missing history is recoverable — show 0
      apiCalls30d = 0
    }

    const oauth = (user.oauthData as Record<string, unknown> | null) ?? {}
    const profileExt = (oauth.profile as Record<string, unknown> | undefined) ?? {}

    const readStr = (k: string): string | null => {
      const v = profileExt[k]
      return typeof v === 'string' && v.length > 0 ? v : null
    }

    const display = readStr('display_name') ?? user.name ?? user.username ?? user.email ?? null
    const handle = readStr('handle') ?? user.username ?? null
    const joinedRaw = user.createdAt ?? null
    const joined =
      joinedRaw instanceof Date
        ? joinedRaw.toISOString().slice(0, 10)
        : typeof joinedRaw === 'string'
          ? joinedRaw.slice(0, 10)
          : null

    res.json({
      display_name: display,
      handle,
      email: user.email ?? null,
      bio: readStr('bio'),
      github: readStr('github') ?? handle,
      twitter: readStr('twitter'),
      website: readStr('website'),
      time_zone: readStr('time_zone'),
      joined,
      api_calls_30d: apiCalls30d,
    })
  } catch (error) {
    logger.error(error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.patch('/', validateBody(updateProfileSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

  const user = await findById<UserRow>('users', userId)
  if (!user) return res.status(404).json({ error: t('profile.notFound') })

  const updates: Record<string, unknown> = {}
  if (typeof req.body.display_name === 'string') updates.name = req.body.display_name
  // Username column has UNIQUE/length constraints; persist optional handle here too if provided.
  if (req.body.handle !== undefined) updates.username = req.body.handle ?? null

  // Profile-extension fields (bio, github, twitter, website, time_zone) live in
  // oauthData.profile so we don't have to add columns. The shape is
  // intentionally a sub-object so other oauthData consumers can coexist.
  const extKeys = ['display_name', 'bio', 'github', 'twitter', 'website', 'time_zone'] as const
  const extPatch: Record<string, unknown> = {}
  for (const k of extKeys) {
    if (Object.prototype.hasOwnProperty.call(req.body, k)) {
      extPatch[k] = (req.body as Record<string, unknown>)[k]
    }
  }
  if (Object.keys(extPatch).length > 0) {
    const oauth = (user.oauthData as Record<string, unknown>) ?? {}
    const existingProfile = (oauth.profile as Record<string, unknown> | undefined) ?? {}
    updates.oauthData = { ...oauth, profile: { ...existingProfile, ...extPatch } }
  }

  if (Object.keys(updates).length > 0) {
    await updateById('users', userId, updates)
  }

  // Re-read so the response is the canonical post-write view, not the wishful pre-write one.
  const fresh = await findById<UserRow>('users', userId)
  const oauth = (fresh?.oauthData as Record<string, unknown> | null) ?? {}
  const ext = (oauth.profile as Record<string, unknown> | undefined) ?? {}
  const readStr = (k: string): string | null => {
    const v = ext[k]
    return typeof v === 'string' && v.length > 0 ? v : null
  }
  res.json({
    display_name: readStr('display_name') ?? fresh?.name ?? null,
    handle: readStr('handle') ?? fresh?.username ?? null,
    email: fresh?.email ?? null,
    bio: readStr('bio'),
    github: readStr('github') ?? fresh?.username ?? null,
    twitter: readStr('twitter'),
    website: readStr('website'),
    time_zone: readStr('time_zone'),
  })
})

export default router
