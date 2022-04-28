import { logger } from '../../logger.js'
import { asyncExec } from './asyncExec.js'

/**
 * Clones a repository by URL to the specified path.
 */
export const cloneRepo = (repoUrl: string, repoPath: string) => {
  logger.info(`Cloning ${repoUrl} into ${repoPath}...`)
  return asyncExec(`git clone ${repoUrl} ${repoPath}`)
}
