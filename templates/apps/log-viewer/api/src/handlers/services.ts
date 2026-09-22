/**
 * log-viewer — services catalog (read-only).
 *
 * Per-user list of services with health + log/error rates. Seeded
 * automatically by `_seed.ts` on first authenticated request so a fresh
 * signup sees a realistic catalog immediately.
 */

import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findById, findMany, type OrderBy, type WhereCondition } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

import { isUuid, route } from './_http.js'
import { seedDemoForUser } from './_seed.js'

const router = Router()

interface ServiceRow {
  id: string
  user_id: string
  name: string
  description: string | null
  owner_team: string | null
  health: string
  error_rate_pct: string | number
  log_rate_per_min: string | number
  recent_volume: unknown
  created_at: Date
  updated_at: Date
}

function decorateService(row: ServiceRow): Record<string, unknown> {
  let recent: number[] = []
  const rv = row.recent_volume
  if (Array.isArray(rv)) recent = rv as number[]
  else if (typeof rv === 'string') {
    try {
      const parsed = JSON.parse(rv)
      if (Array.isArray(parsed)) recent = parsed
    } catch (_error) {
      // Non-JSON volume string; fall back to empty array.
      recent = []
    }
  }
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    owner_team: row.owner_team ?? '',
    health: row.health,
    error_rate_pct:
      typeof row.error_rate_pct === 'string' ? Number(row.error_rate_pct) : row.error_rate_pct,
    log_rate_per_min:
      typeof row.log_rate_per_min === 'string'
        ? Number(row.log_rate_per_min)
        : row.log_rate_per_min,
    recent_volume: recent,
  }
}

router.get(
  '/',
  route('services.list', async (_req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
      return
    }
    await seedDemoForUser(userId)
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    const orderBy: OrderBy[] = [{ field: 'name', direction: 'asc' }]
    const rows = (await findMany<ServiceRow>('services', { where, orderBy })) as ServiceRow[]
    res.json(rows.map(decorateService))
  }),
)

router.get(
  '/:id',
  route('services.get', async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
      return
    }
    const idParam = req.params.id
    const id = Array.isArray(idParam) ? idParam[0] : idParam
    // Malformed id must 404 — the column is uuid and Postgres would 500.
    if (!isUuid(id)) {
      res
        .status(404)
        .json({ error: t('services.notFound', {}, { defaultValue: 'Service not found' }) })
      return
    }
    const row = await findById<ServiceRow>('services', id)
    if (!row || row.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('services.notFound', {}, { defaultValue: 'Service not found' }) })
      return
    }
    res.json(decorateService(row))
  }),
)

export default router
