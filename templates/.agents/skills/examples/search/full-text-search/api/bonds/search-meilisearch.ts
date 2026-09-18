// Wire via the core's setProvider() accessor — it registers under the correct bond
// key internally, so it can never drift from what getProvider() reads. (Raw
// bond('<key>', provider) only works if <key> exactly equals the core's BOND_TYPE.)
import { setProvider } from '@molecule/api-search'
import { provider } from '@molecule/api-search-meilisearch'

export function setupSearch(): void {
  setProvider(provider)
}
