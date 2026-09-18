import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

const router = Router()

interface RecruiterProfile {
  display_name?: string | null
  role?: string | null
  bio?: string | null
  focus?: Record<string, boolean> | null
  public_profile?: boolean | null
}

function unauthorized(res: Response): Response {
  return res
    .status(401)
    .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
}

interface UserRow {
  id: string
  email?: string | null
  name?: string | null
  oauthData?: Record<string, unknown> | null
}

function readProfile(user: UserRow): RecruiterProfile {
  const stored = (user.oauthData?.applicant_tracking_profile ?? null) as RecruiterProfile | null
  if (stored && typeof stored === 'object') return stored
  return {
    display_name: user.name ?? null,
    role: null,
    bio: null,
    focus: {},
    public_profile: true,
  }
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    const user = await findById<UserRow>('users', userId)
    if (!user) return unauthorized(res)
    res.json(readProfile(user))
  } catch (err) {
    console.error('GET /profile failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.put('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    const body = req.body as RecruiterProfile | undefined
    const next: RecruiterProfile = {
      display_name: typeof body?.display_name === 'string' ? body.display_name : null,
      role: typeof body?.role === 'string' ? body.role : null,
      bio: typeof body?.bio === 'string' ? body.bio : null,
      focus: body?.focus && typeof body.focus === 'object' ? body.focus : {},
      public_profile: typeof body?.public_profile === 'boolean' ? body.public_profile : true,
    }
    const user = await findById<UserRow>('users', userId)
    if (!user) return unauthorized(res)
    const oauthData = { ...(user.oauthData ?? {}), applicant_tracking_profile: next }
    await updateById('users', userId, { oauthData })
    res.json(next)
  } catch (err) {
    console.error('PUT /profile failed', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/recent-hires', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    const candidates = await findMany('candidates', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'stage', operator: '=', value: 'hired' },
      ],
      orderBy: [{ field: 'updated_at', direction: 'desc' }],
      limit: 5,
    })
    res.json(candidates)
  } catch (err) {
    console.error('GET /profile/recent-hires failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
