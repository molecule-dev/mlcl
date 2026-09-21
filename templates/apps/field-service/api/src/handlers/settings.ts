import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'
import { authorizers } from '@molecule/api-resource-user'

const router = Router()

/**
 * Per-user company settings, stored inside the shared user row's `oauthData`
 * freeform JSON bag under a `companySettings` key.
 *
 * Why a dedicated route pair: the shared user resource DENYLISTS `oauthData`
 * on every client-facing read (`GET /api/users/me` strips it as OAuth
 * material), and a naive client-side `PATCH /api/users/:id` with
 * `{ oauthData: { companySettings } }` would REPLACE the whole bag —
 * clobbering any OAuth provider identity stored there. Reading and writing
 * server-side closes the loop safely: GET returns only the companySettings
 * slice, PATCH merges it into the existing bag. (Same pattern as the
 * newsletter flagship's /profile/preferences.)
 */
const settingsSchema = z.object({
  organizationName: z.string().max(200).optional(),
  timezone: z.string().max(80).optional(),
  officeHours: z.string().max(80).optional(),
  quoteValidDays: z.number().int().min(1).max(365).optional(),
  reminderLeadHours: z.number().int().min(0).max(720).optional(),
  invoiceDueDays: z.number().int().min(1).max(365).optional(),
  morningTechEmails: z.boolean().optional(),
  requireChecklistDone: z.boolean().optional(),
  notifyUnassignedJobs: z.boolean().optional(),
  notifyQuoteActivity: z.boolean().optional(),
  notifyJobCompletions: z.boolean().optional(),
  notifyInvoicePayments: z.boolean().optional(),
  notifyWeekly: z.boolean().optional(),
})

router.use(authorizers.auth())

// GET / — the persisted companySettings slice (may be empty; the client
// merges its defaults).
router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const user = (await findById('users', userId)) as Record<string, unknown> | null
    if (!user) {
      res.status(404).json({
        error: t('users.notFound', {}, { defaultValue: 'User not found' }),
      })
      return
    }
    const oauthData = (user.oauthData ?? {}) as Record<string, unknown>
    const companySettings =
      oauthData.companySettings && typeof oauthData.companySettings === 'object'
        ? oauthData.companySettings
        : {}
    res.json(companySettings)
  } catch (err) {
    logger.error('[settings] read failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// PATCH / — merge the incoming companySettings into the existing oauthData
// bag (never replacing sibling keys), then echo the merged slice.
router.patch('/', validateBody(settingsSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const user = (await findById('users', userId)) as Record<string, unknown> | null
    if (!user) {
      res.status(404).json({
        error: t('users.notFound', {}, { defaultValue: 'User not found' }),
      })
      return
    }
    const oauthData = (user.oauthData ?? {}) as Record<string, unknown>
    const merged = {
      ...((oauthData.companySettings ?? {}) as Record<string, unknown>),
      ...(req.body as z.infer<typeof settingsSchema>),
    }
    const next = { ...oauthData, companySettings: merged }
    await updateById('users', userId, { oauthData: next })
    res.json(merged)
  } catch (err) {
    logger.error('[settings] update failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
