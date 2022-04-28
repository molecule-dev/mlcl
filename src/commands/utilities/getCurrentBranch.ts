import { asyncExec } from './asyncExec.js'

/**
 * Returns the name of the current branch.
 */
export const getCurrentBranch = async (repoPath = ``) => {
  const { stdout, stderr } = await asyncExec(`git${repoPath ? ` -C "${repoPath}"` : ``} branch --show-current`)

  if (stderr) {
    throw new Error(stderr)
  }

  return stdout.replace(/^\* /, ``).trim()
}
