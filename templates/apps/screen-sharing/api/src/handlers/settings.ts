/**
 * User settings handler — server-side read/merge channel for the app's
 * preference slices stored in `users.oauthData`.
 *
 * WHY THIS EXISTS: the platform user resource NEVER returns `oauthData` on
 * reads (it is write-only by design), so a client that saves preferences via
 * `PATCH /api/users/:id` and reads them back the same way always sees
 * defaults — the settings silently reset on every reload. This channel reads
 * and merges the slice SERVER-side (where the full row is visible) and hands
 * only the app's own sections to the client:
 *
 * - `screenSharing`       — notification/capture/hotkey preferences
 * - `screenSharingProfile` — public profile fields (bio, job title)
 *
 * PATCH merges section-wise (a PATCH carrying only `screenSharing` leaves
 * `screenSharingProfile` — and any other `oauthData` key — untouched).
 */

import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { requireAuth } from '@molecule/api-bonds-default-express'
import { findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

interface OauthData {
  screenSharing?: Record<string, unknown>
  screenSharingProfile?: Record<string, unknown>
  [key: string]: unknown
}

const patchSchema = z
  .object({
    screenSharing: z.record(z.string(), z.unknown()).optional(),
    screenSharingProfile: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: 'At least one settings section is required',
  })

const router = Router()

/** Load the caller's oauthData slices, normalised to plain objects. */
async function readSettings(userId: string): Promise<{
  screenSharing: Record<string, unknown>
  screenSharingProfile: Record<string, unknown>
}> {
  const row = await findById<{ oauthData?: OauthData | string | null }>('users', userId)
  const raw = row?.oauthData
  const oauth: OauthData = typeof raw === 'string' ? (JSON.parse(raw) as OauthData) : (raw ?? {})
  return {
    screenSharing: oauth.screenSharing ?? {},
    screenSharingProfile: oauth.screenSharingProfile ?? {},
  }
}

router.get('/', requireAuth, async (_req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    res.json({ settings: await readSettings(userId) })
  } catch (error) {
    logger.error('settings.read', error)
    res.status(500).json({
      error: t('settings.error.load', undefined, { defaultValue: 'Failed to load settings' }),
    })
  }
})

router.patch('/', requireAuth, async (req: Request, res: Response) => {
  const parsed = patchSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: t('validation.failed', undefined, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
    return
  }
  try {
    const userId = res.locals.session.userId as string
    const row = await findById<{ oauthData?: OauthData | string | null }>('users', userId)
    if (!row) {
      res.status(404).json({
        error: t('users.notFound', undefined, { defaultValue: 'User not found' }),
      })
      return
    }
    const raw = row.oauthData
    const oauth: OauthData = typeof raw === 'string' ? (JSON.parse(raw) as OauthData) : (raw ?? {})
    const next: OauthData = { ...oauth }
    if (parsed.data.screenSharing !== undefined) {
      // Section-level merge: keys inside a section the client did not send
      // survive, so two surfaces (settings page, profile page) never clobber
      // each other's slice.
      next.screenSharing = { ...(oauth.screenSharing ?? {}), ...parsed.data.screenSharing }
    }
    if (parsed.data.screenSharingProfile !== undefined) {
      next.screenSharingProfile = {
        ...(oauth.screenSharingProfile ?? {}),
        ...parsed.data.screenSharingProfile,
      }
    }
    await updateById('users', userId, { oauthData: next })
    logger.info('settings.update', { userId })
    res.json({ settings: await readSettings(userId) })
  } catch (error) {
    logger.error('settings.update', error)
    res.status(500).json({
      error: t('settings.error.save', undefined, { defaultValue: 'Failed to save settings' }),
    })
  }
})

export default router
