import type { NextFunction, Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { create } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

const onboardingSchema = z.object({
  name: z.string().min(1).max(120),
  company: z.string().min(1).max(160),
  role: z.string().min(1).max(80),
  goal: z.string().min(10).max(2000),
  newsletter: z.boolean().optional().default(false),
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

router.post('/', requireAuth, async (req, res) => {
  const parsed = onboardingSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('validation.failed', undefined, { defaultValue: 'Validation failed' }),
      issues: parsed.error.issues,
    })
  }
  const result = await create('onboarding_responses', {
    ...parsed.data,
    user_id: res.locals.session.userId,
    submitted_at: new Date().toISOString(),
  })
  res.status(201).json(result.data)
})

export default router
