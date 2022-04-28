import { asyncExec } from './asyncExec.js'
import { branchExists } from './branchExists.js'
import { getCurrentBranch } from './getCurrentBranch.js'
import { logger } from '../../logger.js'

/**
 * Checks out the branch for the Molecule selection.
 * 
 * If it does not yet exist, it will be created as an empty branch.
 * 
 * Returns `true` if an empty branch was created.
 */
export const checkoutSelectionBranch = async (
  selectionHash: string,
  repoPath = ``,
  branchPath = ``,
  resetIfLocalExists = false,
) => {
  const branchName = `mlcl-${selectionHash}`

  if (await branchExists(branchName, repoPath, branchPath)) {
    if ((await getCurrentBranch(repoPath)) === branchName) {
      logger.info(`Already on branch ${branchName}.`)
      return false
    }

    if (/^remotes\/(.+)/.test(branchPath)) {
      logger.info(`Branch ${branchName} exists at ${branchPath}.`)
      logger.info(`Checking out ${branchName} with tracking from ${branchPath}...`)
      await asyncExec(`git${repoPath ? ` -C "${repoPath}"` : ``} checkout --track ${branchPath.replace(/^remotes\//, ``)}/${branchName}`)
    } else {
      logger.info(`Checking out branch ${branchName}...`)
      await asyncExec(`git${repoPath ? ` -C "${repoPath}"` : ``} checkout ${branchName}`)
    }

    return false
  }

  const localBranchExists = await branchExists(branchName, repoPath)

  if (localBranchExists) {
    logger.info(`Branch ${branchName} already exists locally!`)

    if (!resetIfLocalExists) {
      return false
    }
  } else {
    // Branch does not yet exist, so create it.
    logger.info(`Creating new orphan branch ${branchName}...`)
    await asyncExec(`git${repoPath ? ` -C "${repoPath}"` : ``} checkout --orphan ${branchName}`)
  }

  // Reset it to an empty repository.
  logger.info(`Resetting branch to an empty repository...`)
  await asyncExec(`git${repoPath ? ` -C "${repoPath}"` : ``} rm -rf .`)

  logger.info(`Creating empty initial commit...`)
  await asyncExec(`git${repoPath ? ` -C "${repoPath}"` : ``} commit --allow-empty -m "initialize empty repository"`)
  logger.info(`Branch ${branchName} is ready for assembly.`)

  return true
}
