import { beforeEach, describe, expect, it, vi } from 'vitest'

// computePolicyViolation was missing — reports/approvals hardcoded policy_violation: null, so the
// whole compliance engine (max_amount cap, required receipts) was inert. It now flags expenses
// that break the report's policy. Amounts are in dollars (same unit as policies + expenses).

const db = { findById: vi.fn() }
vi.mock('@molecule/api-database', () => ({ findById: (...a: unknown[]) => db.findById(...a) }))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, vals: Record<string, string>, o: { defaultValue: string }) =>
    o.defaultValue.replace(/\{\{(\w+)\}\}/g, (_m, k) => String(vals[k])),
}))

import { computePolicyViolation } from '../handlers/_policy.js'

beforeEach(() => vi.clearAllMocks())

describe('computePolicyViolation', () => {
  it('returns null when the report has no policy', async () => {
    expect(await computePolicyViolation(null, [{ amount: 999 }])).toBeNull()
    expect(db.findById).not.toHaveBeenCalled()
  })

  it('flags an expense over the max_amount cap', async () => {
    db.findById.mockResolvedValue({ max_amount: 100 })
    const msg = await computePolicyViolation('p1', [{ amount: 150, merchant: 'Hotel' }])
    expect(msg).toBe('Hotel ($150.00) exceeds the $100.00 policy limit')
  })

  it('flags a missing receipt above requires_receipt_above', async () => {
    db.findById.mockResolvedValue({ requires_receipt_above: 25 })
    const msg = await computePolicyViolation('p1', [
      { amount: 50, merchant: 'Lunch', receipt_url: null },
    ])
    expect(msg).toBe('Receipt missing for Lunch ($50.00, over $25.00)')
  })

  it('passes when the receipt is present above the threshold', async () => {
    db.findById.mockResolvedValue({ requires_receipt_above: 25 })
    const msg = await computePolicyViolation('p1', [
      { amount: 50, merchant: 'Lunch', receipt_url: 'https://r/1' },
    ])
    expect(msg).toBeNull()
  })

  it('returns null when everything is within policy', async () => {
    db.findById.mockResolvedValue({ max_amount: 100, requires_receipt_above: 25 })
    const msg = await computePolicyViolation('p1', [
      { amount: 20, merchant: 'Coffee', receipt_url: null },
    ])
    expect(msg).toBeNull()
  })

  it('does NOT flag an expense outside the policy category scope', async () => {
    // Policy governs only meals; a lodging expense over the cap must not be flagged.
    db.findById.mockResolvedValue({ max_amount: 100, categories: ['meals'] })
    const msg = await computePolicyViolation('p1', [
      { amount: 500, merchant: 'Grand Hotel', category: 'lodging' },
    ])
    expect(msg).toBeNull()
  })

  it('flags an in-scope expense when the policy is category-scoped', async () => {
    db.findById.mockResolvedValue({ max_amount: 100, categories: ['meals'] })
    const msg = await computePolicyViolation('p1', [
      { amount: 150, merchant: 'Steakhouse', category: 'meals' },
    ])
    expect(msg).toBe('Steakhouse ($150.00) exceeds the $100.00 policy limit')
  })

  it('governs every category when the scope list is empty', async () => {
    db.findById.mockResolvedValue({ max_amount: 100, categories: [] })
    const msg = await computePolicyViolation('p1', [
      { amount: 150, merchant: 'Anything', category: 'misc' },
    ])
    expect(msg).toBe('Anything ($150.00) exceeds the $100.00 policy limit')
  })
})
