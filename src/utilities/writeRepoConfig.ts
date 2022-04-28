import fs from 'fs'
import path from 'path'
import { repoConfig as currentRepoConfig } from '../repoConfig.js'
import { getRepoRootPathSync } from '../commands/utilities/getRepoRootPathSync.js'

/**
 * Writes the current repo's config to disk.
 */
export const writeRepoConfig = (repoConfig = currentRepoConfig, repoConfigPath = path.join(getRepoRootPathSync(), `.mlclrc.json`)) => {
  fs.writeFileSync(repoConfigPath, JSON.stringify(repoConfig, null, 2))
}
