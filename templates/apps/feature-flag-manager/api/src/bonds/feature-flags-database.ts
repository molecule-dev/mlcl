/**
 * FeatureFlagsDatabase bond setup
 *
 * Wires @molecule/api-feature-flags-database to @molecule/api-feature-flags
 */

import { setProvider } from '@molecule/api-feature-flags'
import { provider } from '@molecule/api-feature-flags-database'

export function setupFeatureFlagsDatabase(): void {
  setProvider(provider)
}
