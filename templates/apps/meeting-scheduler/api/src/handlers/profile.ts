/**
 * `/api/profile/me` — current authed user's profile, projected for the
 * frontend Settings page. Wraps `users` row + entitlements view + booking
 * counts in one request so the page can load with one fetch.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { count, findById, findOne, updateById } from '@molecule/api-database'
import { getEffectiveTier } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import { type MeetingSchedulerLimits, meetingSchedulerPlanKeys } from '../tiers.js'

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
  email: z.string().email().max(320).optional(),
  preferences: z.record(z.string(), z.unknown()).optional(),
})

function project(user: UserRow): {
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
} {
  const fullName = user.name ?? ''
  const [first = '', ...rest] = fullName.split(' ')
  const last = rest.join(' ')
  const initial = (fullName.trim().charAt(0) || user.email?.charAt(0) || 'M').toUpperCase()
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

router.get('/me', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const user = await findById<UserRow>('users', userId)
  if (!user) {
    res.status(404).json({ error: t('user.notFound', {}, { defaultValue: 'User not found' }) })
    return
  }
  const tier = await getEffectiveTier<MeetingSchedulerLimits>(res)
  const eventTypeCount = await count('event_types', [
    { field: 'owner_id', operator: '=', value: userId },
  ])
  const bookingCount = await count('bookings', [
    { field: 'host_user_id', operator: '=', value: userId },
  ])
  const upcomingBookingCount = await count('bookings', [
    { field: 'host_user_id', operator: '=', value: userId },
    { field: 'status', operator: '=', value: 'scheduled' },
    { field: 'start_at', operator: '>', value: new Date().toISOString() },
  ])
  res.json({
    user: project(user),
    plan: {
      planKey: tier.planKey,
      category: tier.category,
      name: tier.name,
      limits: tier.limits,
      isFree: tier.planKey === meetingSchedulerPlanKeys.free,
    },
    counts: {
      eventTypes: eventTypeCount,
      bookings: bookingCount,
      upcomingBookings: upcomingBookingCount,
    },
  })
})

router.patch('/me', validateBody(updateSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const body = req.body as z.infer<typeof updateSchema>
  const existing = await findById<UserRow>('users', userId)
  if (!existing) {
    res.status(404).json({ error: t('user.notFound', {}, { defaultValue: 'User not found' }) })
    return
  }
  if (body.email && body.email !== existing.email) {
    const conflict = await findOne<UserRow>('users', [
      { field: 'email', operator: '=', value: body.email },
    ])
    if (conflict && conflict.id !== userId) {
      res.status(409).json({
        error: t(
          'user.error.emailTaken',
          {},
          { defaultValue: 'That email address is already in use.' },
        ),
      })
      return
    }
  }
  const updates: Record<string, unknown> = {}
  if (body.name !== undefined) updates.name = body.name
  if (body.email !== undefined) updates.email = body.email
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
