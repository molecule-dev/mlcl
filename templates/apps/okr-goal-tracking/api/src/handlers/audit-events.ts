/**
 * Audit-event read handler — surfaces "Recent edits" for the
 * EditObjective sidebar. Audit rows are written by other handlers
 * (objectives.patch); this endpoint is read-only.
 *
 * Uses the abstract DataStore from @molecule/api-database (no raw SQL).
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { requireUser, validationError } from '@molecule/api-bonds-default-express'
import { findMany, type WhereCondition } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const router = Router()

const listQuery = z.object({
  table_name: z.string().min(1).max(64).optional(),
  record_id: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
})

interface AuditRow {
  id: string
  owner_id: string
  actor_user_id: string
  table_name: string
  record_id: string
  action: string
  before: unknown
  after: unknown
  occurred_at: string
}

router.get('/', async (req: Request, res: Response) => {
  const owner = requireUser(res)
  if (!owner) return
  const parsedQuery = listQuery.safeParse(req.query)
  if (!parsedQuery.success) {
    validationError(res, parsedQuery.error.issues)
    return
  }
  try {
    const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: owner }]
    if (parsedQuery.data.table_name) {
      where.push({ field: 'table_name', operator: '=', value: parsedQuery.data.table_name })
    }
    if (parsedQuery.data.record_id) {
      where.push({ field: 'record_id', operator: '=', value: parsedQuery.data.record_id })
    }
    const items = await findMany<AuditRow>('audit_events', {
      where,
      orderBy: [{ field: 'occurred_at', direction: 'desc' }],
      limit: parsedQuery.data.limit ?? 50,
    })
    res.json(items)
  } catch (error) {
    logger.error('audit-events.list', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
