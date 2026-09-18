import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

const router = Router()

router.get('/', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  }
  const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 100))
  const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
  if (typeof req.query.scope === 'string' && req.query.scope.length > 0) {
    where.push({ field: 'scope', operator: '=', value: req.query.scope })
  }
  if (typeof req.query.action === 'string' && req.query.action.length > 0) {
    where.push({ field: 'action', operator: '=', value: req.query.action })
  }
  if (typeof req.query.target === 'string' && req.query.target.length > 0) {
    where.push({ field: 'target', operator: '=', value: req.query.target })
  }
  const rows = await findMany('audit_log', {
    where,
    orderBy: [{ field: 'occurred_at', direction: 'desc' }],
    limit,
  })
  res.json(rows)
})

export default router
