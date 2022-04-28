import semver from 'semver'
import axios from 'axios'
import { pkg } from '../pkg.js'
import { userConfig } from '../userConfig.js'
import { writeUserConfig } from '../utilities/writeUserConfig.js'
import { logger } from '../logger.js'

export const checkVersion = async () => {
  if (userConfig.newVersion) {
    if (semver.gt(userConfig.newVersion, pkg.version)) {
      logger.info(`A new version (${userConfig.newVersion}) of \`mlcl\` is available.`)
      logger.info(`You are currently on version ${pkg.version}.`)
    } else {
      delete userConfig.newVersion
      writeUserConfig()
    }
  }

  try {
    const { version } = (await axios.get(`https://registry.npmjs.org/mlcl/latest`)).data

    if (version && semver.gt(version, pkg.version)) {
      userConfig.newVersion = version
      writeUserConfig()
    }
  } catch (error) {
  }
}

// Check every time `mlcl` is run.
checkVersion()
