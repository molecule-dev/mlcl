/**
 * SearchPostgres bond setup
 *
 * Wires @molecule/api-search-postgres to @molecule/api-search
 */

import { setProvider } from '@molecule/api-search'
import { provider } from '@molecule/api-search-postgres'

export function setupSearchPostgres(): void {
  setProvider(provider)
}
