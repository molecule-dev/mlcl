/**
 * Entitlements bond setup
 *
 * Wires the property-management tier registry into @molecule/api-entitlements
 * so handlers' `enforceLimit(...)` middleware finds a configured provider.
 */

import { setupEntitlements as setup } from '../tiers.js'

export function setupEntitlements(): void {
  setup()
}
