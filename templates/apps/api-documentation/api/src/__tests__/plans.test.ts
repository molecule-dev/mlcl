import { describe, expect, it } from 'vitest'

import { requestsQuotaForPlanKey } from '../lib/plans.js'

// The per-plan requests_quota was displayed on Billing with live usage but never enforced on the
// try-it request path. requestsQuotaForPlanKey is the shared reader the gate now uses.
describe('requestsQuotaForPlanKey', () => {
  it('returns the plan quota (case-insensitive)', () => {
    expect(requestsQuotaForPlanKey('free')).toBe(1_000)
    expect(requestsQuotaForPlanKey('stripemonthly')).toBe(1_000_000)
    expect(requestsQuotaForPlanKey('TeamMonthly')).toBe(100_000_000)
    expect(requestsQuotaForPlanKey('pro')).toBe(1_000_000)
  })

  it('falls back to the free quota for unknown, null, or missing keys', () => {
    expect(requestsQuotaForPlanKey('nonexistent')).toBe(1_000)
    expect(requestsQuotaForPlanKey(null)).toBe(1_000)
    expect(requestsQuotaForPlanKey(undefined)).toBe(1_000)
  })
})
