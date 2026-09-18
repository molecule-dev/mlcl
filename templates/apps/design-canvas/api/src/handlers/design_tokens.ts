/**
 * Design tokens — backs the /library page with the seeded tokens.
 *
 * Endpoints:
 * - GET /design_tokens?section=  — list tokens, optionally filtered by section
 */

import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

const router = Router()

router.get('/', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const section = req.query.section ? String(req.query.section) : null
  const where = section ? [{ field: 'section', operator: '=' as const, value: section }] : []
  const rows = await findMany('design_tokens', {
    where,
    orderBy: [{ field: 'created_at', direction: 'asc' }],
    limit: 500,
  })
  res.json(rows)
})

export default router
