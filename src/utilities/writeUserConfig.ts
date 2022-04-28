import os from 'os'
import fs from 'fs'
import path from 'path'
import { userConfig as currentUserConfig } from '../userConfig.js'

const homeDir = os.homedir()

/**
 * Writes the current user's config to disk.
 */
export const writeUserConfig = (userConfig = currentUserConfig, userConfigPath = path.join(homeDir, `.mlclrc.json`)) => {
  fs.writeFileSync(userConfigPath, JSON.stringify(userConfig, null, 2))
}
