/**
 * Entitlements bond setup
 *
 * Wires the price-comparison tier registry into @molecule/api-entitlements.
 */

import { setupEntitlements as setup } from '../tiers.js'

export function setupEntitlements(): void {
  setup()
}
