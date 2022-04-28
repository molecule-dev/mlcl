/**
 * Payment type definitions.
 * 
 * @module
 */

import * as resourceTypes from '../types'
import * as platforms from './platforms'

/**
 * Every available platform.
 */
export type PlatformKey = `` | keyof typeof platforms

/**
 * Every available plan key.
 */
export type PlanKey = ``
  | keyof typeof platforms.stripe.plans
  | keyof typeof platforms.apple.plans
  | keyof typeof platforms.google.plans

/**
 * Every available plan alias.
 */
export type PlanAlias = ``
  | `monthly`
  | `yearly`
  | `monthlyMolecule`
  | `singleUseMolecule`
  | `unlimitedUseMolecule`
  | `businessMolecule`

/**
 * Every available plan period.
 */
export type PlanPeriod = ``
  | `month`
  | `year`

/**
 * Available platforms.
 */
export type PlanPlatform = `` | `stripe` | `apple` | `google`

/**
 * Map of all available plans by unique keys.
 */
export type Plans = { [planKey in PlanKey]: Plan }

/**
 * Map of plan aliases to available plans, which may vary depending on platform and/or user.
 */
export type PlansByAlias = { [alias in PlanAlias]?: Plan }

/**
 * The payment's properties to be stored in the database.
 */
export interface Props extends resourceTypes.Props {
  /**
   * The payment owner's `userId`.
   */
  userId: string
  /**
   * The payment's associated `moleculeId`, if any.
   */
  moleculeId?: string
  /**
   * The platform through which the product was purchased.
   */
  platformKey: PlatformKey
  /**
   * The transaction ID returned by the platform.
   */
  transactionId?: string
  /**
   * The purchased product ID.
   * 
   * Possibly varies for each platform.
   */
  productId: string
  /**
   * Information describing things like session IDs, confirmations, purchase dates, renewal dates and expiration dates.
   * 
   * Varies for each platform.
   */
  data?: JSONObject
  /**
   * The `transaction.appStoreReceipt` (from Apple) or the `transaction.purchaseToken` (from Google).
   */
  receipt?: string
}

/**
 * Properties and methods used for managing purchases for some platform.
 */
export interface Platform<Plans extends Record<string, Plan> = Record<string, Plan>> {
  /**
   * An array of app platforms the payment platform is compatible with.
   */
  appPlatforms?: Array<
    undefined
    | `ios`
    | `android`
    | `mac`
    | `windows`
    | `linux`
    | `cli`
  >
  /**
   * A map of unique plan keys to plans.
   */
  plans: Plans
}

/**
 * A plan's properties, used for determining renewals and user restrictions.
 * 
 * You will probably need to customize this.
 */
 export interface Plan {
  /**
   * The unique key used for this plan.
   */
  planKey: PlanKey
  /**
   * The platform the plan is for.
   */
  platformKey: PlatformKey
  /**
   * The platform product ID.
   * 
   * Likely varies for each platform.
   */
  platformProductId: string
  /**
   * The plan's alias, typically the same for each platform.
   */
  alias: PlanAlias
  /**
   * How long the plan will be active.
   */
  period: PlanPeriod
  /**
   * `true` if the user is still in their free trial period.
   */
  inTrialPeriod?: boolean
  /**
   * The plan's price as a string with the currency - e.g., '$5'.
   */
  price: string
  /**
   * `true` if more than one can be purchased at a time.
   */
  allowMultiple?: boolean
  /**
   * A minimum quantity if more than one can be purchased.
   */
  minimumQuantity?: number
  /**
   * `true` if the plan will automatically renew.
   */
  autoRenews?: boolean
  /**
   * The plan title.
   */
  title: string
  /**
   * The plan description.
   */
  description: string
  /**
   * An optional short plan description.
   */
  shortDescription?: string
  /**
   * An optional highlighted bit of text about the plan.
   */
  highlightedDescription?: string
  /**
   * The features enabled by the plan.
   */
  capabilities: {
    /**
     * `true` if the plan is for users.
     */
    forUsers?: boolean
    /**
     * `true` if the plan is for molecules.
     */
    forMolecules?: boolean
    /**
     * Allows the user to access premium (private) repositories.
     */
    premium?: boolean
    /**
     * Allows the user to create and view attachments.
     */
    attachments?: boolean
  }
}
