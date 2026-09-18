/**
 * `/api/profile/me` — current authed user's profile + a few view-shaped
 * extras (full name parts, derived avatar initial). The frontend
 * Account page uses this to render the profile section.
 *
 * @module
 */

import { Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

interface UserRow {
  id: string
  email: string | null
  name: string | null
  username: string | null
  oauthServer?: string | null
  oauthData?: Record<string, unknown> | null
  planKey?: string | null
}

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  preferences: z.record(z.string(), z.unknown()).optional(),
})

interface ProjectedUser {
  id: string
  email: string | null
  name: string | null
  first_name: string
  last_name: string
  username: string | null
  initial: string
  oauth_server: string | null
  plan_key: string | null
  preferences: Record<string, unknown>
}

function project(user: UserRow): ProjectedUser {
  const fullName = user.name ?? ''
  const [first = '', ...rest] = fullName.split(' ')
  const last = rest.join(' ')
  const initial = (fullName.trim().charAt(0) || user.email?.charAt(0) || 'A').toUpperCase()
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    first_name: first,
    last_name: last,
    username: user.username,
    initial,
    oauth_server: user.oauthServer ?? null,
    plan_key: user.planKey ?? null,
    preferences: ((user.oauthData as Record<string, unknown> | null)?.preferences ?? {}) as Record<
      string,
      unknown
    >,
  }
}

router.get('/me', async (_req, res) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const user = await findById<UserRow>('users', userId)
  if (!user) {
    res.status(404).json({ error: t('user.notFound', {}, { defaultValue: 'User not found' }) })
    return
  }
  res.json(project(user))
})

router.patch('/me', validateBody(updateSchema), async (req, res) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const body = req.body as z.infer<typeof updateSchema>
  const existing = await findById<UserRow>('users', userId)
  if (!existing) {
    res.status(404).json({ error: t('user.notFound', {}, { defaultValue: 'User not found' }) })
    return
  }
  const updates: Record<string, unknown> = {}
  if (body.name !== undefined) updates.name = body.name
  if (body.preferences !== undefined) {
    const oauthData = (existing.oauthData as Record<string, unknown> | null) ?? {}
    updates.oauthData = { ...oauthData, preferences: body.preferences }
  }
  if (Object.keys(updates).length === 0) {
    res.json(project(existing))
    return
  }
  const result = await updateById<UserRow>('users', userId, updates)
  const next = (result.data ?? existing) as UserRow
  res.json(project(next))
})

export default router
