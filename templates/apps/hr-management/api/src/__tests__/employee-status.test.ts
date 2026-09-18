import { describe, expect, it, vi } from 'vitest'

// _decorate imports api-database at module load; stub it so this pure-function test imports cleanly.
vi.mock('@molecule/api-database', () => ({ findMany: vi.fn() }))

// The app write-path stores the status as 'on-leave' (hyphen) while the seed stores 'on_leave'
// (underscore); the Dashboard KPI + Reports headcount hardcoded 'on_leave' and silently dropped
// app-marked on-leave employees. canonicalEmployeeStatus + ON_LEAVE_STATUSES are the shared reader
// those analytics now use.
import { canonicalEmployeeStatus, ON_LEAVE_STATUSES } from '../handlers/_decorate.js'

describe('canonicalEmployeeStatus', () => {
  it('normalizes every on-leave spelling to on-leave', () => {
    expect(canonicalEmployeeStatus('on_leave')).toBe('on-leave')
    expect(canonicalEmployeeStatus('on-leave')).toBe('on-leave')
    expect(canonicalEmployeeStatus('onleave')).toBe('on-leave')
    expect(canonicalEmployeeStatus('ON_LEAVE')).toBe('on-leave')
  })

  it('maps inactive to terminated and passes active/terminated through', () => {
    expect(canonicalEmployeeStatus('inactive')).toBe('terminated')
    expect(canonicalEmployeeStatus('active')).toBe('active')
    expect(canonicalEmployeeStatus('terminated')).toBe('terminated')
  })

  it('defaults null / undefined / empty to active', () => {
    expect(canonicalEmployeeStatus(null)).toBe('active')
    expect(canonicalEmployeeStatus(undefined)).toBe('active')
    expect(canonicalEmployeeStatus('')).toBe('active')
  })

  it('ON_LEAVE_STATUSES lists both stored spellings the SQL headcount must match', () => {
    expect([...ON_LEAVE_STATUSES]).toEqual(['on_leave', 'on-leave'])
  })
})
