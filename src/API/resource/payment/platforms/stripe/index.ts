/**
 * Properties and methods for handling payments through Stripe.
 * 
 * @module
 */

import * as plans from './plans/index.js'
import * as types from '../../types.js'

/**
 * The Stripe payment platform.
 */
export const stripe: types.Platform<typeof plans> = {
  /**
   * An array of app platforms compatible with Stripe.
   */
  appPlatforms: [
    undefined,
    `mac`,
    `windows`,
    `linux`,
    `cli`
  ],

  /**
   * A map of Stripe plan keys to plan properties.
   */
  plans,
}
