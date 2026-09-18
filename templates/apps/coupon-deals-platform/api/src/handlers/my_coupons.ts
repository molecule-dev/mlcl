import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateQuery } from '@molecule/api-middleware-validation'

import { decorateCoupons } from './_decorate.js'

const router = Router()

const listSchema = z.object({
  status: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
})

router.get('/', validateQuery(listSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

  const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
  if (req.query.status) {
    where.push({ field: 'status', operator: '=', value: String(req.query.status) })
  }
  const limit = req.query.limit ? Number(req.query.limit) : 100
  const rows = await findMany<Record<string, unknown>>('my_coupons', {
    where,
    orderBy: [{ field: 'saved_at', direction: 'desc' }],
    limit,
  })
  res.json(await decorateCoupons(rows))
})

export default router
