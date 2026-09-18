/**
 * App-side mirror of `SmartHomeDashboardLimits` from the API's `tiers.ts`.
 *
 * The api → app stack-boundary discourages cross-imports; this file keeps
 * the shape duplicated so app code can stay strongly-typed without taking
 * a dep on the api package.
 */
export interface SmartHomeDashboardLimits {
  /** Maximum number of automations a user may own. */
  maxAutomations: number

  /** Maximum number of devices a user may own. */
  maxDevices: number

  /** Maximum number of energy a user may own. */
  maxEnergy: number

  /** Maximum number of scenes a user may own. */
  maxScenes: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}
