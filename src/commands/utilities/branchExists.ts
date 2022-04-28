import { asyncExec } from './asyncExec.js'

/**
 * Resolves `true` if the branch exists.
 */
export const branchExists = async (branchName: string, repoPath = ``, branchPath = `refs/heads`) => {
  try {
    const result = await asyncExec(`git${repoPath ? ` -C "${repoPath}"` : ``} show-ref ${branchPath}/${branchName}`)

    return Boolean(result.stdout)
  } catch (error) {
  }

  return false
}
