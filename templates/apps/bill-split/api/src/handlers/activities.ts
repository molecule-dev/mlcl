/**
 * Activities handler — the chronological group feed.
 *
 * GET /api/activities?group_id=<uuid>&limit=50 — newest first. Without a
 * group_id the feed spans every group the user owns (Dashboard + Activity
 * page). Group names are joined in so cross-group feeds read well.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

import { listGroups } from './groups.js'

const router = Router()

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface ActivityRow {
  id?: string
  group_id?: string
  kind?: string
  payload?: Record<string, unknown> | null
  created_at?: string | Date | null
}

router.get('/', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({ error: t('auth.unauthorized') })
  }

  const { group_id, limit } = req.query
  const groups = await listGroups(userId)
  const groupIds = new Set(groups.map((g) => g.id))
  const names = new Map(groups.map((g) => [g.id as string, g.name ?? 'Group']))

  // Scope by group when asked (and owned); otherwise span all groups.
  const wanted = typeof group_id === 'string' && UUID_RE.test(group_id) ? group_id : null
  const scope = wanted && groupIds.has(wanted) ? [wanted] : [...groupIds]
  if (scope.length === 0) {
    return res.json([])
  }

  const rows = await findMany<ActivityRow>('activities', {
    where: [
      {
        field: 'group_id',
        operator: 'in',
        value: scope,
      },
    ],
    orderBy: [{ field: 'created_at', direction: 'desc' }],
    limit: Math.min(Number(limit) || 50, 200),
  })

  res.json(
    rows
      .filter((r) => groupIds.has(r.group_id ?? ''))
      .map((r) => ({
        id: r.id,
        group_id: r.group_id,
        group_name: names.get(r.group_id ?? '') ?? '',
        kind: r.kind ?? 'unknown',
        payload: r.payload ?? {},
        created_at:
          r.created_at instanceof Date ? r.created_at.toISOString() : (r.created_at ?? null),
      })),
  )
})

export default router
