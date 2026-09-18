import type { NextFunction, Request, Response } from 'express'
import { Router } from 'express'

import { count, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

const SORTABLE_FIELDS = new Set(['created_at', 'total', 'status'])

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

router.get('/', requireAuth, async (req, res) => {
  const userId = res.locals.session.userId as string
  const limit = Math.min(Number(req.query.limit) || 25, 100)
  const offset = Number(req.query.offset) || 0
  const sortField =
    typeof req.query.sort === 'string' && SORTABLE_FIELDS.has(req.query.sort)
      ? req.query.sort
      : 'created_at'
  const direction = req.query.dir === 'asc' ? 'asc' : 'desc'

  // Scope to the current user's orders — an authenticated user must never page through
  // another's rows (the count would leak their total too). For an admin/merchant "all
  // orders" view, drop this filter and gate the route on an admin role instead.
  const where: { field: string; operator: '='; value: unknown }[] = [
    { field: 'user_id', operator: '=', value: userId },
  ]
  if (typeof req.query.status === 'string') {
    where.push({ field: 'status', operator: '=', value: req.query.status })
  }

  const [rows, total] = await Promise.all([
    findMany('orders', {
      where,
      orderBy: [{ field: sortField, direction }],
      limit,
      offset,
    }),
    count('orders', where),
  ])

  res.json({ rows, total, limit, offset, sort: sortField, dir: direction })
})

export default router
