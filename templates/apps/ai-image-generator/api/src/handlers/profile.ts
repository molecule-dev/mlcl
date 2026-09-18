/**
 * Profile handler — read + update the authed creator's public profile.
 * Backed by the `public.users` row (`name`, `username`) plus aggregate
 * counts from `generations` and `collections`.
 */
import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import { findById, query, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateParams } from '@molecule/api-middleware-validation'

const router = Router()

const updateSchema = z.object({
  name: z.string().max(120).optional(),
  username: z.string().max(120).optional(),
  bio: z.string().max(2000).optional(),
})

interface UserRow {
  id: string
  email: string | null
  name: string | null
  username: string | null
  oauthData?: { bio?: string } | null
}

interface Profile {
  id: string
  name: string
  handle: string
  /** Only present on the authenticated self view; omitted on public lookups. */
  email?: string | null
  bio: string | null
  creations: number
  collections: number
  followers: number
  following: number
}

/**
 * Builds a creator profile.
 *
 * SECURITY: `email` is PII and must NEVER be exposed on the public
 * (`GET /profile/:id`) path — an unauthenticated caller can pass any id.
 * Pass `{ publicOnly: true }` for the public path so email is omitted; the
 * authenticated self view (`GET /me`) calls without options to include it.
 */
async function buildProfile(
  userId: string,
  { publicOnly = false }: { publicOnly?: boolean } = {},
): Promise<Profile | null> {
  const user = await findById<UserRow>('users', userId)
  if (!user) return null
  const creationsResult = await query<{ count: number | null }>(
    `SELECT COUNT(*)::int AS count FROM generations WHERE user_id = $1`,
    [userId],
  )
  const collectionsResult = await query<{ count: number | null }>(
    `SELECT COUNT(*)::int AS count FROM collections WHERE user_id = $1`,
    [userId],
  )
  const bio = user.oauthData?.bio ?? null
  const profile: Profile = {
    id: user.id,
    name: user.name ?? user.username ?? user.email?.split('@')[0] ?? 'creator',
    handle: user.username ?? (user.email ? user.email.split('@')[0] : 'creator'),
    bio,
    creations: creationsResult.rows[0]?.count ?? 0,
    collections: collectionsResult.rows[0]?.count ?? 0,
    followers: 0,
    following: 0,
  }
  // Email is the authenticated self's PII only — never on the public lookup path.
  if (!publicOnly) profile.email = user.email
  return profile
}

router.get('/me', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }),
      })
    }
    const profile = await buildProfile(userId)
    if (!profile) {
      return res.status(404).json({
        error: t('profile.notFound', {}, { defaultValue: 'Profile not found' }),
      })
    }
    res.json(profile)
  } catch (error) {
    logger.error('profile.getMe', error)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.put('/me', validateBody(updateSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }),
      })
    }
    const body = req.body as z.infer<typeof updateSchema>
    const patch: Record<string, unknown> = { updatedAt: new Date() }
    if (body.name !== undefined) patch.name = body.name
    if (body.username !== undefined) patch.username = body.username
    if (body.bio !== undefined) {
      // Persist the bio inside oauthData (already a jsonb on users).
      const existing = await findById<UserRow>('users', userId)
      const data = existing?.oauthData ?? {}
      patch.oauthData = { ...data, bio: body.bio }
    }
    await updateById('users', userId, patch)
    const profile = await buildProfile(userId)
    res.json(profile)
  } catch (error) {
    logger.error('profile.updateMe', error)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id)
    // Public creator-profile lookup: anyone may view, but never leak email/PII.
    const profile = await buildProfile(id, { publicOnly: true })
    if (!profile) {
      return res.status(404).json({
        error: t('profile.notFound', {}, { defaultValue: 'Profile not found' }),
      })
    }
    res.json(profile)
  } catch (error) {
    logger.error('profile.getById', error)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
