import * as platforms from './platforms/index.js'
import * as types from './types.js'

/**
 * The payment platform for the current app platform.
 */
export const platform = Object.values<types.Platform>(platforms).find(platform => (
  Array.isArray(platform.appPlatforms)
    ? platform.appPlatforms.includes(process.env.APP_PLATFORM || undefined)
    : (platform.appPlatforms || undefined) === (process.env.APP_PLATFORM || undefined)
))
