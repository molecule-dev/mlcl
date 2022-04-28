import fs from 'fs'
import path from 'path'
import { logger } from '../../logger.js'

/**
 * A bit of a hack to make it easier to merge many different commits across various branches.
 * 
 * Creates or updates the .gitattributes file to use custom merge strategies for every file.
 * 
 * Uses a custom JSON merge driver for `.json` files, and diff3 + union for all others.
 */
export const enableMergeDrivers = (repoPath = ``) => {
  const gitConfigPath = repoPath ? path.join(repoPath, `.git`, `config`) : path.join(`.git`, `config`)
  const gitConfigExisted = fs.existsSync(gitConfigPath)
  const originalGitConfig = (gitConfigExisted && fs.readFileSync(gitConfigPath, `utf8`)) || ``
  const gitAttributesPath = repoPath ? path.join(repoPath, `.gitattributes`) : path.join(`.gitattributes`)
  const gitAttributesExisted = fs.existsSync(gitAttributesPath)
  const originalGitAttributes = (gitAttributesExisted && fs.readFileSync(gitAttributesPath, `utf8`)) || ``

  logger.info(`Enabling custom merge drivers...`)

  fs.appendFileSync(gitConfigPath, [
    ``,
    `[merge "json"]`,
    `	name = custom merge driver for json files`,
    `	driver = npx mlcl x-merge-json %O %A %B`,
    `[merge "diff3-union"]`,
    `	name = custom merge driver for all other files`,
    `	driver = git merge-file --diff3 --union %A %O %B`,
    ``,
  ].join(`\n`))

  fs.appendFileSync(gitAttributesPath, [
    ``,
    `* merge=diff3-union`,
    `*.json merge=json`,
    ``,
  ].join(`\n`))

  return () => {
    logger.info(`Removing custom merge drivers...`)

    if (gitConfigExisted) {
      fs.writeFileSync(gitConfigPath, originalGitConfig)
    } else {
      fs.unlinkSync(gitConfigPath)
    }

    if (gitAttributesExisted) {
      fs.writeFileSync(gitAttributesPath, originalGitAttributes)
    } else {
      fs.unlinkSync(gitAttributesPath)
    }
  }
}
