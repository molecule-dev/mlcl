import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, findOne, updateMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const upsertProfileSchema = z.object({
  headline: z.string().max(200).nullable().optional(),
  bio: z.string().max(5000).nullable().optional(),
  resume_url: z.string().url().nullable().optional(),
  skills: z.array(z.string().min(1).max(80)).max(50).optional(),
  location: z.string().max(200).nullable().optional(),
  willing_to_relocate: z.boolean().optional(),
})

/** Strip undefined keys from an object so they don't reach the SQL VALUES clause. */
function compact(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(input)) if (v !== undefined) out[k] = v
  return out
}

router.get('/me', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const profile = await findOne<Record<string, unknown>>('user_profiles', [
      { field: 'user_id', operator: '=', value: userId },
    ])
    res.json(profile ?? { user_id: userId, headline: null, bio: null, skills: [] })
  } catch (err) {
    console.error('[user-profiles] handler failed:', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.put('/me', validateBody(upsertProfileSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const existing = await findOne<Record<string, unknown>>('user_profiles', [
      { field: 'user_id', operator: '=', value: userId },
    ])
    const now = new Date().toISOString()
    const body = req.body as z.infer<typeof upsertProfileSchema>
    const payload = compact({
      headline: body.headline,
      bio: body.bio,
      resume_url: body.resume_url,
      skills: body.skills ? JSON.stringify(body.skills) : undefined,
      location: body.location,
      willing_to_relocate: body.willing_to_relocate,
      updated_at: now,
    })
    if (existing) {
      // user_profiles is keyed by user_id, not id — updateById would target
      // a non-existent "id" column. Use updateMany scoped to this user.
      await updateMany(
        'user_profiles',
        [{ field: 'user_id', operator: '=', value: userId }],
        payload,
      )
      const fresh = await findOne<Record<string, unknown>>('user_profiles', [
        { field: 'user_id', operator: '=', value: userId },
      ])
      res.json(fresh)
      return
    }
    const result = await create('user_profiles', {
      user_id: userId,
      created_at: now,
      ...payload,
    })
    res.json(result.data)
  } catch (err) {
    console.error('[user-profiles] handler failed:', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const targetId = getParamId(req)
    if (targetId !== userId) {
      // V1 only the owner may read their profile. Future: allow company
      // owners to read profiles of users who applied to their jobs.
      res.status(403).json({
        error: t(
          'userProfiles.notOwner',
          {},
          { defaultValue: 'You can only view your own profile' },
        ),
      })
      return
    }
    const profile = await findOne<Record<string, unknown>>('user_profiles', [
      { field: 'user_id', operator: '=', value: targetId },
    ])
    if (!profile) {
      res
        .status(404)
        .json({ error: t('userProfiles.notFound', {}, { defaultValue: 'Profile not found' }) })
      return
    }
    res.json(profile)
  } catch (err) {
    console.error('[user-profiles] handler failed:', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
