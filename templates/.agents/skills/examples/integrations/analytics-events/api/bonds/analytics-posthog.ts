// Wire via the core's setProvider() accessor — it registers under the correct bond
// key internally, so it can never drift from what getProvider() reads. (Raw
// bond('<key>', provider) only works if <key> exactly equals the core's BOND_TYPE.)
import { setProvider } from '@molecule/api-analytics'
import { provider } from '@molecule/api-analytics-posthog'

export function setupAnalytics(): void {
  setProvider(provider)
}
