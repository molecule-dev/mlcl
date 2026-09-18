/**
 * Profile handler — exposes the signed-in user's profile and persists
 * app-specific UI preferences (organization, timezone, language) inside
 * the existing users.oauthData JSON column. We don't add new columns to
 * the auth table; the chatbot-builder-specific keys live under
 * `oauthData.chatbot_builder`.
 *
 * Routes:
 *   GET   /profile/me   — return name/email/plan + chatbot_builder prefs
 *   PATCH /profile/me   — update either core fields (name/email) or prefs
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'
import { authorizers } from '@molecule/api-resource-user'

const router = Router()

router.use(authorizers.auth())

type UserRow = {
  id: unknown
  name?: unknown
  email?: unknown
  planKey?: unknown
  oauthData?: Record<string, unknown> | null
}

const PREF_KEY = 'chatbot_builder'

const updateProfileSchema = z.object({
  name: z.string().max(200).optional(),
  email: z.string().email().max(1023).optional(),
  organization: z.string().max(200).optional(),
  timezone: z.string().max(120).optional(),
  language: z.string().max(60).optional(),
})

function readPrefs(row: UserRow): Record<string, unknown> {
  const raw = (row.oauthData ?? {}) as Record<string, unknown>
  const existing = (raw[PREF_KEY] as Record<string, unknown> | undefined) ?? {}
  return existing
}

function shape(row: UserRow): Record<string, unknown> {
  const prefs = readPrefs(row)
  return {
    id: String(row.id),
    name: row.name ?? '',
    email: row.email ?? '',
    planKey: row.planKey ?? 'free',
    organization: prefs.organization ?? '',
    timezone: prefs.timezone ?? 'Pacific Time (PT) - UTC-8',
    language: prefs.language ?? 'English (US)',
  }
}

router.get('/me', async (_req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const row = await findById<UserRow>('users', userId)
    if (!row) {
      res.status(404).json({ error: t('profile.notFound', {}, { defaultValue: 'User not found' }) })
      return
    }
    res.json(shape(row))
  } catch (error) {
    logger.error('profile.get', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.patch('/me', validateBody(updateProfileSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const row = await findById<UserRow>('users', userId)
    if (!row) {
      res.status(404).json({ error: t('profile.notFound', {}, { defaultValue: 'User not found' }) })
      return
    }
    const body = req.body as z.infer<typeof updateProfileSchema>
    const patch: Record<string, unknown> = {}

    if (body.name !== undefined) patch.name = body.name
    if (body.email !== undefined) patch.email = body.email

    const prefPatch: Record<string, unknown> = { ...readPrefs(row) }
    if (body.organization !== undefined) prefPatch.organization = body.organization
    if (body.timezone !== undefined) prefPatch.timezone = body.timezone
    if (body.language !== undefined) prefPatch.language = body.language

    if (
      body.organization !== undefined ||
      body.timezone !== undefined ||
      body.language !== undefined
    ) {
      const oauthData = { ...((row.oauthData ?? {}) as Record<string, unknown>) }
      oauthData[PREF_KEY] = prefPatch
      patch.oauthData = oauthData
    }

    if (Object.keys(patch).length === 0) {
      res.json(shape(row))
      return
    }

    const updated = await updateById<UserRow>('users', userId, patch)
    const next = (updated.data as UserRow | undefined) ?? { ...row, ...patch }
    res.json(shape(next))
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    res.status(500).json({ error: t('common.serverError', {}, { defaultValue: message }) })
  }
})

export default router
