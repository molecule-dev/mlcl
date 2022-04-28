import { Command } from 'commander'
import { userConfig } from '../userConfig.js'
import { userLoggedIn } from '../utilities/userLoggedIn.js'
import * as API from '../API/index.js'
import { logger } from '../logger.js'

/**
 * Adds the `add-ssh-key` command to the program.
 */
export const addSshKey = (program: Command) => {
  program.command(`add-ssh-key`)
    .description(`finds or creates \`~/.ssh/id_*.pub\` (using \`ssh-keygen\`) and adds it to your Molecule.dev account for your current CLI device`)
    .argument(`[path]`, `specify the location of the SSH key`)
    .action(async (sshKeyPath = ``) => {
      const user = await userLoggedIn()

      if (!user) {
        return
      }

      const deviceId = userConfig.userIdsToDeviceIds?.[user.id] || ``

      if (!deviceId) {
        logger.warn(`No device ID for the current user. Try logging out and in again.`)
        return
      }

      await API.resource.device.utilities.sendSshKey(deviceId, user.username, sshKeyPath)
    })
}
