import fs from 'fs'
import path from 'path'
import { RepoConfig } from '../types/index.js'
import { getRepoRootPathSync } from '../commands/utilities/getRepoRootPathSync.js'
import { logger } from '../logger.js'

/**
 * Reads and returns the current repo's config.
 */
export const readRepoConfig = (repoConfigPath = path.join(getRepoRootPathSync(), `.mlclrc.json`)) => {
  try {
    if (fs.existsSync(repoConfigPath)) {
      const config = JSON.parse(fs.readFileSync(repoConfigPath, `utf8`))

      return config as RepoConfig
    }
  } catch (error) {
    logger.error(error)
  }

  return {} as RepoConfig
}
