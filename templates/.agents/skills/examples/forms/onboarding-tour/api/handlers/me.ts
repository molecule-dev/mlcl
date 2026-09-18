import type { NextFunction, Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

// The tour writes a per-user timestamp so it never runs twice. A boolean flag
// works too, but a timestamp also tells you *when* a user onboarded.
//
// SCHEMA: this stores tour state in a NEW column on the framework `users` table.
// `users` already EXISTS, so the "missing migration" verifier (which flags missing
// TABLES only) will NOT remind you — add this column or the PATCH 500s and the GET
// always returns undefined (so the tour re-runs on every visit):
//   ALTER TABLE users ADD COLUMN tour_completed_at text;
const updateSchema = z.object({
  // ISO datetime when the user finished/skipped the tour; null re-arms it.
  tour_completed_at: z.string().datetime().nullable().optional(),
})

const requireAuth = (_req: Request, res: Response, next: NextFunction): void => {
  if (!res.locals.session?.userId) {
    res
      .status(401)
      .json({ error: t('auth.required', undefined, { defaultValue: 'Authentication required' }) })
    return
  }
  next()
}

const router = Router()

// GET /me — the tour reads `tour_completed_at`; if it's null the tour runs.
// Scoped to the session user only — never accepts an id from the client.
router.get('/', requireAuth, async (_req, res) => {
  const user = await findById('users', res.locals.session.userId as string)
  if (!user)
    return res
      .status(404)
      .json({ error: t('me.notFound', undefined, { defaultValue: 'User not found' }) })
  // Strip secrets before returning.
  const { password_hash: _ph, ...safe } = user as Record<string, unknown>
  res.json(safe)
})

// PATCH /me — called when the user clicks Done or Skip. Only the caller's own
// row is ever touched (userId comes from the session, not the body).
router.patch('/', requireAuth, async (req, res) => {
  const parsed = updateSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('validation.failed', undefined, { defaultValue: 'Validation failed' }),
      issues: parsed.error.issues,
    })
  }
  const result = await updateById('users', res.locals.session.userId as string, parsed.data)
  if (!result.data) {
    return res
      .status(404)
      .json({ error: t('me.notFound', undefined, { defaultValue: 'User not found' }) })
  }
  const { password_hash: _ph, ...safe } = result.data as Record<string, unknown>
  res.json(safe)
})

export default router
