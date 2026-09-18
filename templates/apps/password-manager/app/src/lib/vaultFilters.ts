/**
 * Vault list filter pills and the pure predicate that decides which rows each one shows.
 *
 * The `favorite` pill (and the row star) exist because `vault_items.favorite` was user-settable
 * and returned on every item, yet the list never surfaced it. Keeping the predicate here — off a
 * small facets object rather than the full row — lets it be unit-tested without a component render.
 */
export type VaultFilterId = 'all' | 'weak' | 'reused' | 'shared' | 'favorite'

/** The subset of a mapped vault row the filter predicate inspects. */
export interface VaultRowFacets {
  strength: 1 | 2 | 3 | 4 | null
  weak: boolean
  reused: boolean
  shared: boolean
  favorite: boolean
}

/** Whether a row belongs under the currently-selected filter pill. */
export function matchesVaultFilter(row: VaultRowFacets, filter: VaultFilterId): boolean {
  switch (filter) {
    case 'weak':
      return row.strength === 1 || row.strength === 2 || row.weak
    case 'reused':
      return row.reused
    case 'shared':
      return row.shared
    case 'favorite':
      return row.favorite
    case 'all':
    default:
      return true
  }
}
