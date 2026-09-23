/**
 * Profile handler — per-user public-identity extras (name, handle, bio,
 * publicProfile, avatarUrl) for the AI Voice Assistant.
 *
 * Stores the extras inside the existing `users.oauthData` jsonb column under
 * a `profile` key. The platform user resource (GET/PATCH /users/:id) NEVER
 * returns `oauthData` on reads, so a client-side read-modify-write through
 * that route is impossible — it used to silently wipe sibling keys
 * (it clobbered `voicePreferences`, the /preferences slice). The merge
 * therefore happens SERVER-SIDE here:
 *   - GET  /profile       → the merged extras slice (defaults applied)
 *   - PATCH /profile      → merges the accepted fields into the stored row
 * Name/email updates ride the same route so the client needs one call for
 * "Save profile" — the users row is updated directly, exactly like the
 * platform's own CRUD route would.
 *
 * Architecture:
 *   - Reads/writes flow through `@molecule/api-database`'s DataStore
 *     (`findById`, `updateById`). No raw SQL — gate G3.
 *   - Inputs validated with zod — gate G5.
 *   - All endpoints scope by the authenticated user — gate G6.
 */

import { Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

interface UserRow {
  id: string
  name: string | null
  email: string | null
  oauthData: Record<string, unknown> | null
}

interface ProfileExtras {
  handle?: string
  bio?: string
  publicProfile?: boolean
  avatarUrl?: string | null
}

const DEFAULT_PUBLIC_PROFILE = true

// avatarUrl is a data: URL — a 1.5MB image inflates ~33% in base64 and must
// stay inside the API's 2mb JSON body limit.
const updateSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    handle: z.string().max(64).optional(),
    bio: z.string().max(2000).optional(),
    publicProfile: z.boolean().optional(),
    avatarUrl: z.string().max(1_900_000).optional(),
  })
  .strict()

const router = Router()

function readExtras(row: UserRow | null): ProfileExtras {
  const oauthData = row?.oauthData ?? {}
  const stored = (oauthData as { profile?: Partial<ProfileExtras> }).profile
  return {
    handle: stored?.handle ?? '',
    bio: stored?.bio ?? '',
    publicProfile: stored?.publicProfile ?? DEFAULT_PUBLIC_PROFILE,
    avatarUrl: stored?.avatarUrl ?? null,
  }
}

router.get('/', async (_req, res) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('errors.unauthorized', {}, { defaultValue: 'Not authorized' }) })
      return
    }
    const user = await findById<UserRow>('users', userId)
    res.json(readExtras(user))
  } catch (error) {
    logger.error('profile.get', error)
    res.status(500).json({ error: t('errors.server', {}, { defaultValue: 'Server error' }) })
  }
})

router.patch('/', async (req, res) => {
  try {
    const parsed = updateSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: t('errors.badRequest', {}, { defaultValue: 'Bad request' }) })
      return
    }
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('errors.unauthorized', {}, { defaultValue: 'Not authorized' }) })
      return
    }
    const user = await findById<UserRow>('users', userId)
    if (!user) {
      res.status(404).json({ error: t('errors.notFound', {}, { defaultValue: 'Not found' }) })
      return
    }
    // Server-side merge: start from the CURRENT stored extras so a partial
    // PATCH (or a client that cannot read oauthData) can never clobber
    // sibling keys — the bug class that motivated this route.
    const current = readExtras(user)
    const next: ProfileExtras = {
      handle: parsed.data.handle ?? current.handle,
      bio: parsed.data.bio ?? current.bio,
      publicProfile: parsed.data.publicProfile ?? current.publicProfile,
      avatarUrl: parsed.data.avatarUrl ?? current.avatarUrl,
    }
    const oauthData: Record<string, unknown> = { ...(user.oauthData ?? {}), profile: next }
    await updateById<UserRow>('users', userId, {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      oauthData,
    })
    res.json(next)
  } catch (error) {
    logger.error('profile.update', error)
    res.status(500).json({ error: t('errors.server', {}, { defaultValue: 'Server error' }) })
  }
})

export default router
