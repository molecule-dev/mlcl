import { Command } from 'commander'
import { userConfig } from '../userConfig.js'
import { synchronizeUserConfig } from '../utilities/synchronizeUserConfig.js'
import * as API from '../API/index.js'
import { logger } from '../logger.js'

/**
 * Adds the `login` command to the program.
 */
export const login = (program: Command) => {
  program.command(`login`)
    .description(`log into mlcl with your Molecule.dev account via the browser`)
    .action(async () => {
      await synchronizeUserConfig()

      if (userConfig.user) {
        logger.info(`Logged in as ${userConfig.user.username}.`)
        logger.info(`If you would like to log in as another user, run \`mlcl logout\` first.`)
        return
      }

      await API.resource.user.utilities.logIn()
    })
}
