import { Command } from 'commander'
import { userConfig } from '../userConfig.js'
import { userLoggedIn } from '../utilities/userLoggedIn.js'
import * as API from '../API/index.js'
import { logger } from '../logger.js'
import { getErrorMessage } from '../utilities/getErrorMessage.js'

/**
 * Adds the `remove-ssh-key` command to the program.
 */
export const removeSshKey = (program: Command) => {
  program.command(`remove-ssh-key`)
    .description(`removes your current CLI device's SSH key from your Molecule.dev account`)
    .action(async () => {
      const user = await userLoggedIn()

      if (!user) {
        return
      }

      const deviceId = userConfig.userIdsToDeviceIds?.[user.id] || ``

      if (!deviceId) {
        logger.warn(`No device ID for the current user. Try logging out and in again.`)
        return
      }

      logger.info(`Removing public SSH key from the API...`)

      try {
        const { props } = (await API.resource.device.update(deviceId, { sshKey: `` })).data

        if (props.sshKey === ``) {
          logger.info(`SSH key successfully removed!`)
        } else {
          logger.info(`Failed to remove SSH key.`)
        }
      } catch (error) {
        logger.warn(`Failed to remove SSH key. ${getErrorMessage(error)}`)
      }
    })
}
