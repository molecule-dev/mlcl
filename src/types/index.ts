/**
 * Types used throughout `mlcl`.
 * 
 * @module
 */

import * as userTypes from '../API/resource/user/types.js'

export * as global from './global.js'

/**
 * Molecule user configuration.
 * 
 * Mostly used for authenticating with the Molecule.dev API.
 * 
 * We'll be adding some really useful functionality surrounding this in the future.
 */
export interface UserConfig {
  /**
   * Stored authorization headers used for talking to the Molecule.dev API.
   */
  authorizationHeader?: string
  /**
   * Remember the user's device.
   */
  userIdsToDeviceIds?: { [userId: string]: string }
  /**
   * The current user's properties.
   */
  user?: userTypes.Props
  /**
   * This will be asynchronously set to the latest `mlcl` version number if available
   * on the NPM registry. A message will be shown to the user, suggesting the update.
   */
  newVersion?: string
}

/**
 * Molecule repository configuration.
 * 
 * We'll be adding some really useful functionality surrounding this in the future.
 */
export interface RepoConfig {
  id: string
}

/**
 * Git commit information.
 */
export interface Commit {
  hash: string
  subject?: string
}
