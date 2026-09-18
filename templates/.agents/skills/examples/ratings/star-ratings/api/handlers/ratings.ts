import type { NextFunction, Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { create, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

const ratingSchema = z.object({
  subject_id: z.string().min(1),
  stars: z.number().int().min(1).max(5),
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
  const parsed = ratingSchema.safeParse(req.body)
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: t('validation.failed', undefined, { defaultValue: 'Validation failed' }) })
  }
  const userId = res.locals.session.userId as string

  // Upsert: one rating per (user, subject).
  const [existing] = await findMany('ratings', {
    where: [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'subject_id', operator: '=', value: parsed.data.subject_id },
    ],
    limit: 1,
  })
  if (existing) {
    const result = await updateById('ratings', (existing as { id: string }).id, {
      stars: parsed.data.stars,
      updated_at: new Date().toISOString(),
    })
    return res.json(result.data)
  }
  const result = await create('ratings', {
    ...parsed.data,
    user_id: userId,
    created_at: new Date().toISOString(),
  })
  res.status(201).json(result.data)
})

router.get('/avg/:subject_id', async (req, res) => {
  const ratings = await findMany('ratings', {
    where: [{ field: 'subject_id', operator: '=', value: req.params.subject_id }],
    limit: 100_000,
  })
  if (ratings.length === 0) {
    return res.json({ average: null, count: 0 })
  }
  const total = ratings.reduce((acc, r) => acc + (r as { stars: number }).stars, 0)
  res.json({ average: total / ratings.length, count: ratings.length })
})

export default router
