/**
 * Properties and methods for handling payments through Google.
 * 
 * @module
 */

import * as plans from './plans/index.js'
import * as types from '../../types.js'

/**
 * The Google Pay payment platform.
 */
export const google: types.Platform<typeof plans> = {
  /**
   * An array of app platforms compatible with Google Pay.
   */
  appPlatforms: [
    `android`,
  ],

  /**
   * A map of Google plan keys to plan properties.
   */
  plans,
}
