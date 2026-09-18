/**
 * Entitlements bond setup
 *
 * Wires the student-portal tier registry into @molecule/api-entitlements.
 */

import { setupEntitlements as setup } from '../tiers.js'

export function setupEntitlements(): void {
  setup()
}
