import os from 'os'
import fs from 'fs'
import path from 'path'
import { UserConfig } from '../types/index.js'
import { logger } from '../logger.js'

const homeDir = os.homedir()

/**
 * Reads and returns the current user's config.
 */
export const readUserConfig = (userConfigPath = path.join(homeDir, `.mlclrc.json`)) => {
  try {
    if (fs.existsSync(userConfigPath)) {
      const config = JSON.parse(fs.readFileSync(userConfigPath, `utf8`))

      return config as UserConfig
    }
  } catch (error) {
    logger.error(error)
  }

  return {} as UserConfig
}
