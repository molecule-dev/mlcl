import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

import { decorateNotification } from './_decorate.js'

const router = Router()

const listSchema = z.object({
  unread: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
})

const markReadSchema = z.object({
  read_at: z.string().optional(),
})

router.get('/', validateQuery(listSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

  const where: Array<{ field: string; operator: '='; value: unknown }> = [
    { field: 'user_id', operator: '=', value: userId },
  ]
  if (req.query.unread === 'true') {
    where.push({ field: 'unread', operator: '=', value: true })
  }
  const limit = req.query.limit ? Number(req.query.limit) : 100
  const rows = await findMany<Record<string, unknown>>('notifications', {
    where,
    orderBy: [{ field: 'created_at', direction: 'desc' }],
    limit,
  })
  res.json(await Promise.all(rows.map((n) => decorateNotification(n))))
})

// authSelf-style mark-read — owner_user_id scope on update.
router.put('/:id/read', validateBody(markReadSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

  const id = getParamId(req)
  const existing = await findById<Record<string, unknown>>('notifications', id)
  if (!existing || existing.user_id !== userId) {
    return res.status(404).json({ error: t('errors.notFound') })
  }
  const result = await updateById<Record<string, unknown>>('notifications', id, {
    unread: false,
    read_at: req.body.read_at ? new Date(req.body.read_at) : new Date(),
  })
  const row = (result.data ?? result) as Record<string, unknown>
  res.json(await decorateNotification(row))
})

export default router
