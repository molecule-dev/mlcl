import { describe, expect, it } from 'vitest'

import { matchesVaultFilter, type VaultRowFacets } from '../lib/vaultFilters.js'

// vault_items.favorite was user-settable and returned on every item, but the Vault list never
// surfaced it. matchesVaultFilter is the extracted predicate the list now uses; the 'favorite'
// branch is the fix. The other pills are locked too, so extracting the predicate didn't drift them.
const base: VaultRowFacets = {
  strength: 4,
  weak: false,
  reused: false,
  shared: false,
  favorite: false,
}

describe('matchesVaultFilter', () => {
  it('all shows every row', () => {
    expect(matchesVaultFilter(base, 'all')).toBe(true)
    expect(matchesVaultFilter({ ...base, favorite: true, weak: true }, 'all')).toBe(true)
  })

  it('favorite shows only starred rows', () => {
    expect(matchesVaultFilter({ ...base, favorite: true }, 'favorite')).toBe(true)
    expect(matchesVaultFilter({ ...base, favorite: false }, 'favorite')).toBe(false)
  })

  it('weak matches strength 1/2 or the weak flag, not strong rows', () => {
    expect(matchesVaultFilter({ ...base, strength: 1 }, 'weak')).toBe(true)
    expect(matchesVaultFilter({ ...base, strength: 2 }, 'weak')).toBe(true)
    expect(matchesVaultFilter({ ...base, weak: true }, 'weak')).toBe(true)
    expect(matchesVaultFilter({ ...base, strength: 4 }, 'weak')).toBe(false)
  })

  it('reused and shared each match only their own flag', () => {
    expect(matchesVaultFilter({ ...base, reused: true }, 'reused')).toBe(true)
    expect(matchesVaultFilter(base, 'reused')).toBe(false)
    expect(matchesVaultFilter({ ...base, shared: true }, 'shared')).toBe(true)
    expect(matchesVaultFilter(base, 'shared')).toBe(false)
  })
})
