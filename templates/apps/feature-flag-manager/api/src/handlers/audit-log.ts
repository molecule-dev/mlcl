/**
 * feature-flag-manager — audit-log read API.
 *
 * Audit entries are append-only; this handler exposes only list (no
 * mutation, no delete). Writes are produced by the flags / environments /
 * segments handlers via `recordAudit()`.
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const listAuditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  flag_id: z.string().uuid().optional(),
  action: z.string().min(1).max(120).optional(),
  target: z.string().min(1).max(255).optional(),
})

router.get('/', validateQuery(listAuditQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
      return
    }
    const q = req.query as unknown as z.infer<typeof listAuditQuerySchema>
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (q.flag_id) where.push({ field: 'flag_id', operator: '=', value: q.flag_id })
    if (q.action) where.push({ field: 'action', operator: '=', value: q.action })
    if (q.target) where.push({ field: 'target', operator: '=', value: q.target })

    const orderBy: OrderBy[] = [{ field: 'occurred_at', direction: 'desc' }]
    const entries = await findMany('audit_log', {
      where,
      orderBy,
      limit: q.limit,
      offset: (q.page - 1) * q.limit,
    })
    res.json(entries)
  } catch (error) {
    logger.error('audit-log.list', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
