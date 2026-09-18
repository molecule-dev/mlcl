import type { NextFunction, Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { create, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { broadcast } from '@molecule/api-realtime'

const requireAuth = (_req: Request, res: Response, next: NextFunction): void => {
  if (!res.locals.session?.userId) {
    res
      .status(401)
      .json({ error: t('auth.required', undefined, { defaultValue: 'Authentication required' }) })
    return
  }
  next()
}

const createSchema = z.object({
  channel_id: z.string().min(1),
  content: z.string().min(1).max(10000),
})

const router = Router()

router.get('/', requireAuth, async (req, res) => {
  const { channel_id, limit } = req.query
  const where: { field: string; operator: '='; value: unknown }[] = []
  if (channel_id) where.push({ field: 'channel_id', operator: '=', value: channel_id })
  const messages = await findMany('messages', {
    where,
    limit: Number(limit) || 50,
    orderBy: [{ field: 'created_at', direction: 'asc' }],
  })
  res.json(messages)
})

router.post('/', requireAuth, async (req, res) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('validation.failed', undefined, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
  }
  const result = await create('messages', {
    ...parsed.data,
    user_id: res.locals.session.userId,
    created_at: new Date().toISOString(),
  })
  await broadcast(`channel:${parsed.data.channel_id}`, 'message:created', result.data)
  res.status(201).json(result.data)
})

export default router
