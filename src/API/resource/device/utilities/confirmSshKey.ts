import { read } from '../index.js'
import { sendSshKey } from './sendSshKey.js'
import { logger } from '../../../../logger.js'

export const confirmSshKey = async (deviceId: string, name: string) => {
  try {
    const device = (await read(deviceId)).data.props

    if (device.sshKey) {
      return true
    }

    const sshKeyConfirmed = await sendSshKey(deviceId, name)

    if (sshKeyConfirmed) {
      return true
    }
  } catch (error) {
  }

  logger.warn(`The Molecule.dev API could not confirm your device SSH key.`)
  logger.warn(`Use \`mlcl add-ssh-key\` or try logging out and in again.`)

  return false
}
