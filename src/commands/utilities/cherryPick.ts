import { asyncExec } from './asyncExec.js'
import { logger } from '../../logger.js'

/**
 * Cherry picks the commit onto the current branch.
 * 
 * Returns `true` if successful.
 */
export const cherryPick = async (commitHash: string, repoPath = ``, parameters = ``) => {
  try {
    const { stderr } = await asyncExec(`git${repoPath ? ` -C "${repoPath}"` : ``} cherry-pick ${commitHash} ${parameters}`)

    if (stderr) {
      throw new Error(stderr)
    }

    return true
  } catch (error) {
    logger.error(error)
  }

  return false
}
