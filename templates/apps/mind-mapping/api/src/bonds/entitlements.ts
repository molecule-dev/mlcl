/**
 * Entitlements bond setup
 *
 * Wires the mind-mapping tier registry into @molecule/api-entitlements
 * so getEffectiveTier() / enforceLimit() resolve real limits per request.
 */

import { setupEntitlements as setup } from '../tiers.js'

export function setupEntitlements(): void {
  setup()
}
