/**
 * App-feature provider wiring.
 *
 * `@molecule/app-data-table`, `@molecule/app-date-range-picker`,
 * `@molecule/app-virtual-scroll`, and `@molecule/app-command-palette` ship
 * the feature contracts; the actual concrete providers (e.g.
 * `@molecule/app-data-table-tanstack`) are wired here when needed by a
 * specific page. The MetroPulse flagship currently renders the board pages
 * directly via React + ClassMap and does not require any extra bond
 * setup beyond what `MoleculeProvider` already configures, so this file
 * is intentionally empty — it exists so the bond-discovery pipeline finds
 * a hook point for adding providers later.
 */

export {}
