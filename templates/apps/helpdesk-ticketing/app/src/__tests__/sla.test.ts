import { describe, expect, it } from 'vitest'

import { computeSlaCompliance } from '../lib/sla.js'

// The SLA policies store resolution_hours per priority, but the compliance figure read phantom
// fields (always 0) or a hardcoded 94. computeSlaCompliance is the real calc: it judges each ticket
// against its priority's target using created→(resolved|now).
const policies = [
  { priority: 'urgent', resolution_hours: 4, active: true },
  { priority: 'low', resolution_hours: 120, active: true },
]
const NOW = new Date('2026-01-02T00:00:00Z').getTime()
const hoursAgo = (h: number): string => new Date(NOW - h * 3_600_000).toISOString()

describe('computeSlaCompliance', () => {
  it('is 100% and excludes tickets whose priority has no active policy', () => {
    expect(computeSlaCompliance([], policies, NOW).compliancePct).toBe(100)
    const r = computeSlaCompliance(
      [{ priority: 'nonexistent', status: 'open', created_at: hoursAgo(999) }],
      policies,
      NOW,
    )
    expect(r.total).toBe(0)
    expect(r.compliancePct).toBe(100)
  })

  it('counts a resolved-within-target ticket as compliant', () => {
    // urgent target 4h; created 10h ago, resolved 8h ago → 2h to resolve
    const r = computeSlaCompliance(
      [
        {
          priority: 'urgent',
          status: 'resolved',
          created_at: hoursAgo(10),
          updated_at: hoursAgo(8),
        },
      ],
      policies,
      NOW,
    )
    expect(r).toMatchObject({ total: 1, compliant: 1, breached: 0, overdue: 0, compliancePct: 100 })
  })

  it('counts a resolved-late ticket as breached but not overdue', () => {
    // created 10h ago, resolved 2h ago → 8h to resolve, over the 4h target
    const r = computeSlaCompliance(
      [{ priority: 'urgent', status: 'closed', created_at: hoursAgo(10), updated_at: hoursAgo(2) }],
      policies,
      NOW,
    )
    expect(r).toMatchObject({ compliant: 0, breached: 1, overdue: 0 })
  })

  it('counts an open ticket past target as breached AND overdue', () => {
    const r = computeSlaCompliance(
      [{ priority: 'urgent', status: 'open', created_at: hoursAgo(10) }],
      policies,
      NOW,
    )
    expect(r).toMatchObject({ compliant: 0, breached: 1, overdue: 1 })
  })

  it('counts an open ticket still within target as compliant', () => {
    const r = computeSlaCompliance(
      [{ priority: 'urgent', status: 'open', created_at: hoursAgo(1) }],
      policies,
      NOW,
    )
    expect(r).toMatchObject({ compliant: 1, overdue: 0, compliancePct: 100 })
  })

  it('ignores inactive policies', () => {
    const r = computeSlaCompliance(
      [{ priority: 'urgent', status: 'open', created_at: hoursAgo(10) }],
      [{ priority: 'urgent', resolution_hours: 4, active: false }],
      NOW,
    )
    expect(r.total).toBe(0)
  })

  it('mixes compliant + breached into a percentage', () => {
    const r = computeSlaCompliance(
      [
        {
          priority: 'urgent',
          status: 'resolved',
          created_at: hoursAgo(10),
          updated_at: hoursAgo(8),
        },
        { priority: 'urgent', status: 'open', created_at: hoursAgo(10) },
      ],
      policies,
      NOW,
    )
    expect(r).toMatchObject({ total: 2, compliant: 1, compliancePct: 50, overdue: 1 })
  })
})
