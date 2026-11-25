/**
 * The packages only the scaffolds choose (`selection: 'scaffold-only'` in the registry): the bond
 * and server bundles the flagship templates call. A custom stack already has its server and bond
 * wiring, and naming a bundle installs every provider it wires (the Express bond bundle requires
 * 45 packages, from Stripe to S3), so `mlcl create --packages` and `mlcl add` refuse them by name
 * before anything is written. Templates and the scaffold still declare them.
 *
 * @module
 */

import { getRawRegistry } from './registry.js'

/**
 * The names in a caller's list that only the scaffolds choose.
 *
 * @param names - Scoped package names, as the caller gave them.
 * @param packages - Registry entries by name (default: the registry mlcl reads).
 * @returns Those names, in the caller's order.
 */
export function scaffoldOnlyNames(
  names: readonly string[],
  packages: Readonly<Record<string, { selection?: string } | undefined>> = getRawRegistry()
    .packages,
): string[] {
  return names.filter((name) => packages[name]?.selection === 'scaffold-only')
}
