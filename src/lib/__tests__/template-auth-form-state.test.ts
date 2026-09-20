import { describe, expect, it } from 'vitest'

import { scanAuthViews } from '../../../scripts/verify-auth-form-state.mjs'

/**
 * TPL1 fleet gate. This is the test that would have caught the original
 * regression: 64 of 133 flagship templates shipped with their auth views
 * holding `email` in local `useState`, so the email typed on one auth view
 * was lost when switching views. The imports/catalog checks never inspected
 * field wiring, so it shipped invisibly. This asserts against the REAL
 * shipped template files (what `mlcl create` copies out verbatim).
 */
describe('TPL1 — template auth views wire useAuthFormState (no local email state)', () => {
  const result = scanAuthViews()

  it('scans a meaningful number of auth views', () => {
    // Sanity floor: every template in the fleet, several auth views each.
    expect(result.scanned).toBeGreaterThan(400)
  })

  it('has ZERO auth views holding the shared email field in local useState', () => {
    const offenders = result.violations.map((v) => `${v.file} — ${v.reason}`)
    expect(offenders).toEqual([])
  })

  it('wires useAuthFormState across the fleet (guards a mass-unwiring regression)', () => {
    // Every template with an editable, cross-view email field now imports
    // the hook; the count is broad (most templates have 3-4 such views).
    expect(result.wired).toBeGreaterThan(400)
  })
})
