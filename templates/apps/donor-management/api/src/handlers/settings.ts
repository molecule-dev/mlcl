/**
 * donor-management — organization & giving preferences.
 *
 * GET  /api/settings  → the caller's merged company settings object
 * PATCH /api/settings → validates a partial settings object, MERGES it into
 *                       the stored slice server-side, returns the merge.
 *
 * Why a dedicated channel: the platform user resource NEVER returns
 * `oauthData` on reads, so a page that persists these settings through
 * PATCH /api/users/:id + reads them back off /users/me silently resets to
 * defaults on every reload. This handler reads/merges the stored slice
 * server-side (the users."oauthData" jsonb column, `companySettings` key)
 * so what the page saves is what the next load returns. Strictly the
 * caller's own row — no cross-tenant reads.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { findOne, query } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'
import { authorizers } from '@molecule/api-resource-user'

const router = Router()

export const companySettingsSchema = z.object({
  organizationName: z.string().max(200).optional(),
  organizationEin: z.string().max(32).optional(),
  timezone: z.string().max(100).optional(),
  officeHours: z.string().max(100).optional(),
  defaultFund: z.string().max(100).optional(),
  receiptFooterNote: z.string().max(500).optional(),
  receiptNumberPrefix: z.string().max(10).optional(),
  signatoryName: z.string().max(200).optional(),
  signatoryTitle: z.string().max(200).optional(),
  notifyNewGifts: z.boolean().optional(),
  notifyCampaignGoals: z.boolean().optional(),
  notifyLapsedDonors: z.boolean().optional(),
  notifyReceiptsIssued: z.boolean().optional(),
  notifyWeekly: z.boolean().optional(),
})

export type CompanySettings = z.infer<typeof companySettingsSchema>

const SETTINGS_KEY = 'companySettings'

router.use(authorizers.auth())

/** Read the stored settings slice for a user row (or null when absent). */
async function readStoredSettings(userId: string): Promise<CompanySettings | null> {
  const row = await findOne<{ oauthData?: unknown }>('users', [
    { field: 'id', operator: '=', value: userId },
  ])
  const oauth = row?.oauthData
  if (!oauth || typeof oauth !== 'object') return null
  const slice = (oauth as Record<string, unknown>)[SETTINGS_KEY]
  const parsed = companySettingsSchema.safeParse(slice)
  return parsed.success ? parsed.data : null
}

router.get('/', async (_req: Request, res: Response) => {
  const userId = res.locals.session.userId as string
  try {
    const settings = await readStoredSettings(userId)
    res.json({ settings: settings ?? {} })
  } catch (err) {
    logger.error('settings.read failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.patch('/', validateBody(companySettingsSchema), async (req: Request, res: Response) => {
  const userId = res.locals.session.userId as string
  try {
    const stored = await readStoredSettings(userId)
    const merged = { ...(stored ?? {}), ...(req.body as CompanySettings) }

    // Merge through jsonb_set so concurrent oauthData writers (platform
    // account sections) never have their keys clobbered by this one.
    const updated = await query<{ oauthData?: unknown }>(
      `UPDATE "users"
          SET "oauthData" = jsonb_set(COALESCE("oauthData", '{}'::jsonb), $1, $2::jsonb, true),
              "updatedAt" = now()
        WHERE "id" = $3
        RETURNING "oauthData"`,
      [`{${SETTINGS_KEY}}`, JSON.stringify(merged), userId],
    )
    if (!updated.rows?.length) {
      res.status(404).json({ error: t('common.notFound', {}, { defaultValue: 'Not found' }) })
      return
    }
    res.json({ settings: merged })
  } catch (err) {
    logger.error('settings.update failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
