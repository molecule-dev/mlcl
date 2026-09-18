/**
 * Audit-log handler — read-only.
 *
 * Reads the `audit_log` table written by every employees / pay-runs /
 * deductions mutation via @molecule/api-audit's `log()` call. The
 * AuditLog page surfaces the caller's own activity (filtered by
 * `actor = userId`) so a user only sees their own audit trail.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

const router = Router()

router.get('/', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

  const where: Array<{ field: string; operator: '=' | 'ilike'; value: unknown }> = [
    { field: 'actor', operator: '=', value: userId },
  ]
  if (req.query.resource) {
    where.push({ field: 'resource', operator: '=', value: String(req.query.resource) })
  }
  if (req.query.action) {
    where.push({ field: 'action', operator: '=', value: String(req.query.action) })
  }
  const rows = await findMany<Record<string, unknown>>('audit_log', {
    where,
    orderBy: [{ field: 'timestamp', direction: 'desc' }],
    limit: 250,
  })
  res.json(rows)
})

export default router
