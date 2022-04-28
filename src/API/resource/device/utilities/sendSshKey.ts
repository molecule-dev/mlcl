import fs from 'fs'
import os from 'os'
import path from 'path'
import { execSync } from 'child_process'
import { update } from '../index.js'
import { logger } from '../../../../logger.js'
import { getErrorMessage } from '../../../../utilities/getErrorMessage.js'

const homeDir = os.homedir()
const sshDir = path.join(homeDir, `.ssh`)

const findPubKey = (filename: string) => /^id_(.+)\.pub$/.test(filename)

export const sendSshKey = async (deviceId: string, name: string, sshKeyPath?: string) => {
  if (!sshKeyPath) {
    if (!fs.existsSync(sshDir)) {
      fs.mkdirSync(sshDir, { recursive: true })
    }

    logger.info(`Looking for ~/.ssh/id_*.pub...`)
    sshKeyPath = fs.readdirSync(sshDir).find(findPubKey)

    if (sshKeyPath) {
      logger.info(`Found ~/.ssh/${sshKeyPath}.`)
    }
  }

  if (!sshKeyPath) {
    logger.info(`Public SSH key not found. Using \`ssh-keygen\` to create one.`)

    try {
      execSync(`ssh-keygen -t ed25519 -C "${name}" -f id_ed25519`, { encoding: `utf8`, stdio: [ 0, 1, 2 ] })
      fs.renameSync(`id_ed25519`, path.join(sshDir, `id_ed25519`))
      fs.renameSync(`id_ed25519.pub`, path.join(sshDir, `id_ed25519.pub`))
    } catch (error) {
      logger.warn(`Error: ${getErrorMessage(error)}`)
    }

    sshKeyPath = fs.readdirSync(sshDir).find(findPubKey)

    if (sshKeyPath) {
      logger.info(`Created ~/.ssh/${sshKeyPath}.`)
    }
  }

  if (!sshKeyPath) {
    logger.warn(`No public SSH key to add.`)
    return false
  }

  const sshKey = fs.readFileSync(path.join(sshDir, sshKeyPath), `utf8`)

  if (!sshKey) {
    logger.warn(`SSH key file is empty.`)
    return false
  }

  logger.info(`Sending public SSH key to the API...`)

  const timeout = setTimeout(() => {
    logger.info(`This may take a moment...`)
  }, 2000)

  try {
    const { props } = (await update(deviceId, { sshKey })).data

    if (!props.sshKey) {
      throw new Error(`The Molecule.dev API did not confirm the SSH key.`)
    }

    clearTimeout(timeout)
    logger.info(`SSH key successfully added!`)
    return true
  } catch (error) {
    clearTimeout(timeout)
    logger.warn(`Failed to add SSH key. ${getErrorMessage(error)}`)
  }

  return false
}
