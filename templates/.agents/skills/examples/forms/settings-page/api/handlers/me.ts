import type { NextFunction, Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  email: z.string().email().optional(),
  timezone: z.string().min(1).max(64).optional(),
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

router.patch('/', requireAuth, async (req, res) => {
  const parsed = updateSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('validation.failed', undefined, { defaultValue: 'Validation failed' }),
      issues: parsed.error.issues,
    })
  }
  const userId = res.locals.session.userId as string
  const patch: Record<string, unknown> = { ...parsed.data }
  // Changing the email invalidates the verified flag: the new address hasn't
  // been proven yet. Leaving emailVerified=true would let a user (or a hijacked
  // session) point a "verified" email at any address. Reset it and re-send the
  // verification email (see auth/email-verification) — never trust the new
  // address until it's re-verified.
  if (parsed.data.email !== undefined) {
    const current = (await findById('users', userId)) as { email?: string } | null
    if (current && parsed.data.email !== current.email) {
      patch.emailVerified = false
    }
  }
  const result = await updateById('users', userId, patch)
  if (!result.data) {
    return res
      .status(404)
      .json({ error: t('me.notFound', undefined, { defaultValue: 'User not found' }) })
  }
  const { password_hash: _ph, ...safe } = result.data as Record<string, unknown>
  res.json(safe)
})

export default router
