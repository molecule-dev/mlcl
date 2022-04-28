import { Command } from 'commander'
import { userConfig } from '../userConfig.js'
import { synchronizeUserConfig } from '../utilities/synchronizeUserConfig.js'
import { writeUserConfig } from '../utilities/writeUserConfig.js'
import * as API from '../API/index.js'
import { logger } from '../logger.js'

/**
 * Adds the `logout` command to the program.
 */
export const logout = (program: Command) => {
  program.command(`logout`)
    .description(`logs out of your Molecule.dev account`)
    .action(async () => {
      await synchronizeUserConfig()

      if (!userConfig?.user?.id) {
        logger.warn(`Not logged in.`)
        return
      }

      API.resource.user.logOut()
      delete userConfig.user
      writeUserConfig()
      logger.info(`Logged out.`)
    })
}
