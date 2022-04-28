/**
 * Properties and methods for handling payments through Apple.
 *
 * @module
 */

import * as plans from './plans/index.js'
import * as types from '../../types.js'

/**
 * The Apple Pay payment platform.
 */
export const apple: types.Platform<typeof plans> = {
  /**
   * An array of app platforms compatible with Apple Pay.
   */
  appPlatforms: [
    `ios`,
  ],

  /**
   * A map of Apple plan keys to plan properties.
   */
  plans,
}
