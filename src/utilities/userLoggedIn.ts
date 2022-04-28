import { userConfig } from '../userConfig.js'
import { synchronizeUserConfig } from './synchronizeUserConfig.js'
import * as API from '../API/index.js'
import { logger } from '../logger.js'

/**
 * Ensures the user is logged in before continuing.
 * 
 * If the user is not logged in, automatically runs the `login` command.
 */
export const userLoggedIn = async () => {
  await synchronizeUserConfig()

  if (userConfig?.user?.id) {
    logger.info(`Hello, ${userConfig.user.name || userConfig.user.username}!`)
  } else {
    logger.info(`Not logged into \`mlcl\`. Logging in...`)

    await API.resource.user.utilities.logIn()

    if (!userConfig.user?.id) {
      logger.warn(`Not logged in. Run \`mlcl login\` first.`)
      return null
    }
  }

  return userConfig.user
}
