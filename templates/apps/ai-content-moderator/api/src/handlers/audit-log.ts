/**
 * Audit log handler — read-only listing of moderation actions.
 *
 * Routes:
 *   GET /audit-log               list audit events scoped to caller's owner_id
 *
 * Audit rows are inserted by other handlers (moderation, rules) and never
 * mutated. This endpoint exists for compliance/forensics; per CLAUDE.md / G6
 * we filter strictly by `owner_id` so cross-tenant peeking is impossible.
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { findMany, type WhereCondition } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateQuery } from '@molecule/api-middleware-validation'
import { authorizers } from '@molecule/api-resource-user'

const router = Router()

const listQuerySchema = z.object({
  target_type: z.enum(['flagged_content', 'moderation_rules', 'api_tokens']).optional(),
  target_id: z.string().uuid().optional(),
  action: z.string().min(1).max(64).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional().default(100),
})

router.use(authorizers.auth())

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const { target_type, target_id, action, limit } = req.query as unknown as z.infer<
      typeof listQuerySchema
    >

    const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: userId }]
    if (target_type) where.push({ field: 'target_type', operator: '=', value: target_type })
    if (target_id) where.push({ field: 'target_id', operator: '=', value: target_id })
    if (action) where.push({ field: 'action', operator: '=', value: action })

    const rows = await findMany('audit_log', {
      where,
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
      limit,
    })
    res.json(rows)
  } catch (error) {
    logger.error('audit-log.list', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
