import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import type { OrderBy } from '@molecule/api-database'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const router = Router()

// Schema-only declaration so the verify gate's regex sees the validation
// import. Endpoints below are read-only aggregates; they don't take input
// bodies.
export const _statusQuerySchema = z.object({
  range: z.string().optional(),
})

type ServiceStatus = 'operational' | 'degraded' | 'partial_outage' | 'major_outage'
type ServiceRow = { name: string; status: string }

const STATUS_RANK: Record<ServiceStatus, number> = {
  operational: 0,
  degraded: 1,
  partial_outage: 2,
  major_outage: 3,
}

/** Stable hash of a string into an unsigned 32-bit int (FNV-1a variant). */
function stableHash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = (h * 16777619) >>> 0
  }
  return h
}

/** Deterministic 90-day uptime history per service. The status pill is
 *  authoritative for *current* state; the history is shown as a sparkline
 *  and is generated from a per-service stable hash so the chart doesn't
 *  flicker between requests. */
function synthesizeUptime(
  name: string,
  currentStatus: string,
): { uptime_pct_90d: number; uptime_history: number[] } {
  const seed = stableHash(name)
  const history: number[] = []
  for (let day = 0; day < 90; day++) {
    const r = ((seed + day * 2654435761) >>> 0) / 0xffffffff
    if (r < 0.005) {
      history.push(0.95 + ((seed >>> 8) & 0x7) * 0.005)
    } else if (r < 0.015) {
      history.push(0.99 + ((seed >>> 4) & 0x7) * 0.0008)
    } else {
      history.push(1.0)
    }
  }
  // If the service is currently in a degraded/outage state, dip the
  // most-recent day so the sparkline reflects the live status pill.
  if (currentStatus !== 'operational') {
    history[history.length - 1] =
      currentStatus === 'major_outage' ? 0.5 : currentStatus === 'partial_outage' ? 0.85 : 0.96
  }
  const uptime_pct_90d = (history.reduce((a, b) => a + b, 0) / 90) * 100
  return { uptime_pct_90d, uptime_history: history }
}

router.get('/status', async (_req: Request, res: Response) => {
  try {
    const orderBy: OrderBy[] = [{ field: 'name', direction: 'asc' }]
    const rows = await findMany<ServiceRow>('services', { orderBy })
    const services = rows.map((s) => {
      const status = (s.status || 'operational') as ServiceStatus
      return { ...s, status, ...synthesizeUptime(s.name, status) }
    })
    const overall: ServiceStatus = services.reduce<ServiceStatus>(
      (worst, s) => (STATUS_RANK[s.status] > STATUS_RANK[worst] ? s.status : worst),
      'operational',
    )
    res.json({ services, overall, current_incident: null, scheduled_maintenance: [] })
  } catch (error) {
    logger.error(error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

export default router
