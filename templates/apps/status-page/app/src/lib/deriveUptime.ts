/**
 * Derive a 90-day uptime history from REAL incident records that
 * include this component in `affected_components`. No deterministic
 * "sample" data — if no incidents touched the component, every day
 * reads operational. The earliest day for components younger than
 * 90 days is `unknown` so users can tell new services apart from
 * historically-clean ones.
 */

import type { UptimeDay, UptimeDayStatus } from '../components/UptimeBar.js'

type IncidentImpact = 'minor' | 'major' | 'critical' | 'maintenance' | 'none' | 'unknown'

export interface IncidentLike {
  id: string
  impact: IncidentImpact
  affected_components?: string[] | null
  created_at: string
  resolved_at?: string | null
}

export interface ComponentLike {
  id: string
  name: string
  created_at?: string | null
}

const IMPACT_TO_STATUS: Record<IncidentImpact, UptimeDayStatus> = {
  minor: 'degraded',
  major: 'partial',
  critical: 'major',
  maintenance: 'maintenance',
  none: 'operational',
  unknown: 'operational',
}

const STATUS_RANK: Record<UptimeDayStatus, number> = {
  operational: 0,
  unknown: 0,
  empty: 0,
  maintenance: 1,
  degraded: 2,
  partial: 3,
  major: 4,
}

const STATUS_BASE_PCT: Record<UptimeDayStatus, number> = {
  operational: 100,
  unknown: 100,
  empty: 100,
  maintenance: 99.0,
  degraded: 99.5,
  partial: 97.0,
  major: 90.0,
}

/**
 * Build 90 days of UptimeDay entries (oldest → newest).
 *
 * Day matching: an incident occupies every day from its `created_at`
 * (UTC date) through `resolved_at` (or `now` if still open). For each
 * day we keep the worst impact across all incidents that touched the
 * component. Components younger than the day are reported as `unknown`.
 */
export function deriveUptime90(component: ComponentLike, incidents: IncidentLike[]): UptimeDay[] {
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const startMs = today.getTime() - 89 * 86400_000

  const componentCreated = component.created_at ? new Date(component.created_at).getTime() : null

  const dayWorst = new Map<string, { status: UptimeDayStatus; count: number }>()
  for (const inc of incidents) {
    if (!inc.affected_components || !inc.affected_components.includes(component.id)) continue
    const begin = Math.max(new Date(inc.created_at).getTime(), startMs)
    const end = inc.resolved_at ? new Date(inc.resolved_at).getTime() : Date.now()
    if (Number.isNaN(begin) || Number.isNaN(end) || begin > end) continue
    const status = IMPACT_TO_STATUS[inc.impact] ?? 'degraded'
    for (let cursor = begin; cursor <= end; cursor += 86400_000) {
      const d = new Date(cursor)
      d.setUTCHours(0, 0, 0, 0)
      const iso = d.toISOString().slice(0, 10)
      const cur = dayWorst.get(iso)
      if (!cur || STATUS_RANK[status] > STATUS_RANK[cur.status]) {
        dayWorst.set(iso, { status, count: (cur?.count ?? 0) + 1 })
      } else {
        cur.count += 1
      }
    }
  }

  const days: UptimeDay[] = []
  for (let i = 89; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400_000)
    const iso = d.toISOString().slice(0, 10)
    const isBeforeBirth = componentCreated !== null && d.getTime() + 86400_000 <= componentCreated
    if (isBeforeBirth) {
      days.push({ date: iso, status: 'unknown' })
      continue
    }
    const hit = dayWorst.get(iso)
    if (hit) {
      days.push({
        date: iso,
        status: hit.status,
        uptimePct: STATUS_BASE_PCT[hit.status],
        incidentCount: hit.count,
      })
    } else {
      days.push({ date: iso, status: 'operational', uptimePct: 100 })
    }
  }
  return days
}

export function aggregateUptimePct(days: UptimeDay[]): number {
  const known = days.filter((d) => d.status !== 'unknown' && d.status !== 'empty')
  if (known.length === 0) return 100
  const total = known.reduce((acc, d) => acc + (d.uptimePct ?? 100), 0)
  return total / known.length
}
