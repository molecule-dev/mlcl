import fs from 'fs'
import path from 'path'
import { Command } from 'commander'
import { userConfig } from '../userConfig.js'
import { userLoggedIn } from '../utilities/userLoggedIn.js'
import { getPlan } from '../API/resource/molecule/utilities/getPlan.js'
import { confirmSshKey } from '../API/resource/device/utilities/confirmSshKey.js'
import * as API from '../API/index.js'
import { logger } from '../logger.js'
import { getErrorMessage } from '../utilities/getErrorMessage.js'
import { cloneRepo } from './utilities/cloneRepo.js'
import { checkoutSelectionBranch } from './utilities/checkoutSelectionBranch.js'
import { enableMergeDrivers } from './utilities/enableMergeDrivers.js'
import { cherryPick } from './utilities/cherryPick.js'
import { asyncExec } from './utilities/asyncExec.js'
import { convertTypeDocToJSDoc } from './utilities/convertTypeDocToJSDoc.js'
import { convertNpmToYarn } from './utilities/convertNpmToYarn.js'
import { convertTypeScriptToJavaScript } from './utilities/convertTypeScriptToJavaScript.js'

/**
 * Adds the `clone` command to the program.
 */
export const clone = (program: Command) => {
  program.command(`clone`)
    .description(`clones your Molecule into \`project-name-api\` and/or \`project-name-app\``)
    .argument(`<id>`, `your Molecule's ID`)
    .argument(`[projectName]`, `a directory for your Molecule, usually something like \`project-name\``)
    .action(async (id = ``, projectName = ``) => {
      if (!id) {
        logger.warn(`Molecule ID is required.`)
        return
      }

      const user = await userLoggedIn()

      if (!user) {
        return
      }

      try {
        logger.info(`Fetching your Molecule's clone information...`)

        const {
          props,
          apiCommits,
          apiRepoUrl,
          appCommits,
          appRepoUrl,
        } = (await API.resource.molecule.readClone(id)).data

        const {
          name,
          apiSelectionHash,
          appSelectionHash,
        } = props

        if (((!apiSelectionHash || !apiRepoUrl)) && (!appSelectionHash || !appRepoUrl)) {
          logger.warn(`Failed to fetch the necessary information to clone your Molecule. Please contact developer-support@molecule.dev so we can fix this.`)
          return
        }

        const moleculePlan = getPlan(props)

        if (moleculePlan?.capabilities.forMolecules && moleculePlan?.capabilities.premium) {
          const deviceId = userConfig.userIdsToDeviceIds?.[user.id] || ``

          if (!deviceId) {
            logger.warn(`No device ID for the current user. Try logging out and in again.`)
            return
          }

          const confirmedSshKey = await confirmSshKey(deviceId, user.username)

          if (!confirmedSshKey) {
            return
          }
        }

        projectName = projectName || name?.replace(/ /gi, `-`).replace(/[^A-z0-9-]/gi, ``).toLowerCase() || `your`

        const apiRepoPath = `${projectName}-api`
        const appRepoPath = `${projectName}-app`
        let apiError = false
        let appError = false

        if (apiSelectionHash && apiRepoUrl) {
          let resetMergeDrivers: null | (() => void) = null
          const writeNewRepoConfig = async () => {
            const repoConfigPath = path.join(apiRepoPath, `.mlclrc.json`)

            logger.info(`Creating ${apiRepoPath}/.mlclrc.json...`)

            try {
              await fs.promises.access(repoConfigPath, fs.constants.R_OK | fs.constants.W_OK)
              logger.info(`${apiRepoPath}/.mlclrc.json already exists on your machine!`)
              apiError = true
            } catch (error) {
              await fs.promises.writeFile(repoConfigPath, JSON.stringify({ id }, null, 2))
            }
          }

          try {
            await fs.promises.access(apiRepoPath, fs.constants.R_OK | fs.constants.W_OK)
            logger.warn(`Error cloning API: ${apiRepoPath} already exists on your machine!`)
            apiError = true
          } catch (error) {
            try {
              await cloneRepo(apiRepoUrl, apiRepoPath)
            } catch (error) {
              logger.warn(`Error cloning API: ${getErrorMessage(error) || `Unknown error`}`)
              apiError = true
            }
          }

          try {
            const createdEmptyBranch = await checkoutSelectionBranch(apiSelectionHash, apiRepoPath, `remotes/origin`)

            if (!createdEmptyBranch) {
              await writeNewRepoConfig()
              logger.info(`API is ready.`)
            } else if (apiCommits?.length) {
              const convert = {
                typeScriptToJavaScript: props.selection.apiLanguage === `JavaScript`,
                typeDocToJSDoc: props.selection.apiDocs === `JSDoc`,
                npmToYarn: props.selection.apiPackageManager === `Yarn`,
              }

              logger.info(`You are the first to assemble this particular Molecule API!`)

              resetMergeDrivers = enableMergeDrivers(apiRepoPath)

              logger.info(`Cherry picking the relevant commits...`)

              while (apiCommits.length) {
                const commit = apiCommits.shift()

                if (commit?.hash) {
                  logger.info(`Cherry picking ${commit.hash.substring(0, 7)} (${commit.subject || `Unknown commit??? This should never happen!!!`})`)
                  await cherryPick(commit.hash, apiRepoPath, `-x`)
                } else {
                  logger.info(`No commit to cherry pick??? This should never happen!!!`)
                }
              }

              resetMergeDrivers()

              if (convert.typeDocToJSDoc || convert.npmToYarn || convert.typeScriptToJavaScript) {
                // Delete package-lock.json for any of these.
                try {
                  const packageLockPath = path.join(apiRepoPath, `package-lock.json`)
                  await fs.promises.unlink(packageLockPath)
                } catch (error) {
                }
              }

              if (convert.typeDocToJSDoc) {
                try {
                  logger.info(`Converting TypeDoc to JSDoc...`)
                  await convertTypeDocToJSDoc(apiRepoPath)
                  await asyncExec(`git -C "${apiRepoPath}" add --all`)
                  await asyncExec(`git -C "${apiRepoPath}" commit -m "convert typedoc to jsdoc"`)
                } catch (error) {
                  logger.warn(`Error: ${getErrorMessage(error)}`)
                  throw error
                }
              }

              if (convert.npmToYarn) {
                try {
                  logger.info(`Converting NPM to Yarn...`)
                  await convertNpmToYarn(apiRepoPath)
                  await asyncExec(`git -C "${apiRepoPath}" add --all`)
                  await asyncExec(`git -C "${apiRepoPath}" commit -m "convert npm to yarn"`)
                } catch (error) {
                  logger.warn(`Error: ${getErrorMessage(error)}`)
                  throw error
                }
              }

              if (convert.typeScriptToJavaScript) {
                try {
                  logger.info(`Converting TypeScript to JavaScript...`)
                  await convertTypeScriptToJavaScript(apiRepoPath)
                  await asyncExec(`git -C "${apiRepoPath}" add --all`)
                  await asyncExec(`git -C "${apiRepoPath}" commit -m "convert typescript to javascript"`)
                } catch (error) {
                  logger.warn(`Error: ${getErrorMessage(error)}`)
                  throw error
                }
              }

              await writeNewRepoConfig()
              logger.info(`API is ready.`)
            } else {
              logger.warn(`Created an empty branch but no commits to cherry pick.`)
              apiError = true
            }
          } catch (error) {
            if (resetMergeDrivers) {
              resetMergeDrivers()
            }

            logger.warn(`Error assembling API: ${getErrorMessage(error) || `Unknown error`}`)
            apiError = true
          }
        }

        if (appSelectionHash && appRepoUrl) {
          let resetMergeDrivers: null | (() => void) = null
          const writeNewRepoConfig = async () => {
            const repoConfigPath = path.join(appRepoPath, `.mlclrc.json`)

            logger.info(`Creating ${appRepoPath}/.mlclrc.json...`)

            try {
              await fs.promises.access(repoConfigPath, fs.constants.R_OK | fs.constants.W_OK)
              logger.info(`${appRepoPath}/.mlclrc.json already exists on your machine!`)
              appError = true
            } catch (error) {
              await fs.promises.writeFile(repoConfigPath, JSON.stringify({ id }, null, 2))
            }
          }

          try {
            await fs.promises.access(appRepoPath, fs.constants.R_OK | fs.constants.W_OK)
            logger.warn(`Error cloning app: ${appRepoPath} already exists on your machine!`)
            appError = true
          } catch (error) {
            try {
              await cloneRepo(appRepoUrl, appRepoPath)
            } catch (error) {
              logger.warn(`Error cloning app: ${getErrorMessage(error) || `Unknown error`}`)
              appError = true
            }
          }

          try {
            const createdEmptyBranch = await checkoutSelectionBranch(appSelectionHash, appRepoPath, `remotes/origin`)

            if (!createdEmptyBranch) {
              await writeNewRepoConfig()
              logger.info(`App is ready.`)
            } else if (appCommits?.length) {
              const convert = {
                typeScriptToJavaScript: props.selection.appLanguage === `JavaScript`,
                typeDocToJSDoc: props.selection.appDocs === `JSDoc`,
                npmToYarn: props.selection.appPackageManager === `Yarn`,
              }

              logger.info(`You are the first to assemble this particular Molecule app!`)

              resetMergeDrivers = enableMergeDrivers(appRepoPath)

              logger.info(`Cherry picking the relevant commits...`)

              while (appCommits.length) {
                const commit = appCommits.shift()

                if (commit?.hash) {
                  logger.info(`Cherry picking ${commit.hash.substring(0, 7)} (${commit.subject || `Unknown commit??? This should never happen!!!`})`)
                  await cherryPick(commit.hash, appRepoPath, `-x`)
                } else {
                  logger.info(`No commit to cherry pick??? This should never happen!!!`)
                }
              }

              resetMergeDrivers()

              if (convert.typeDocToJSDoc || convert.npmToYarn || convert.typeScriptToJavaScript) {
                // Delete package-lock.json for any of these.
                try {
                  const packageLockPath = path.join(appRepoPath, `package-lock.json`)
                  await fs.promises.unlink(packageLockPath)
                } catch (error) {
                }
              }

              if (convert.typeDocToJSDoc) {
                try {
                  logger.info(`Converting TypeDoc to JSDoc...`)
                  await convertTypeDocToJSDoc(appRepoPath)
                  await asyncExec(`git -C "${appRepoPath}" add --all`)
                  await asyncExec(`git -C "${appRepoPath}" commit -m "convert typedoc to jsdoc"`)
                } catch (error) {
                  logger.warn(`Error: ${getErrorMessage(error)}`)
                  throw error
                }
              }

              if (convert.npmToYarn) {
                try {
                  logger.info(`Converting NPM to Yarn...`)
                  await convertNpmToYarn(appRepoPath)
                  await asyncExec(`git -C "${appRepoPath}" add --all`)
                  await asyncExec(`git -C "${appRepoPath}" commit -m "convert npm to yarn"`)
                } catch (error) {
                  logger.warn(`Error: ${getErrorMessage(error)}`)
                  throw error
                }
              }

              if (convert.typeScriptToJavaScript) {
                try {
                  logger.info(`Converting TypeScript to JavaScript...`)
                  await convertTypeScriptToJavaScript(appRepoPath)
                  await asyncExec(`git -C "${appRepoPath}" add --all`)
                  await asyncExec(`git -C "${appRepoPath}" commit -m "convert typescript to javascript"`)
                } catch (error) {
                  logger.warn(`Error: ${getErrorMessage(error)}`)
                  throw error
                }
              }

              await writeNewRepoConfig()
              logger.info(`App is ready.`)
            } else {
              logger.warn(`Created an empty branch but no commits to cherry pick.`)
              appError = true
            }
          } catch (error) {
            if (resetMergeDrivers) {
              resetMergeDrivers()
            }

            logger.warn(`Error assembling app: ${getErrorMessage(error) || `Unknown error`}`)
            appError = true
          }
        }

        if (apiSelectionHash && appSelectionHash) {
          if (apiError || appError) {
            logger.info(`There may have been an error cloning your Molecule.`)
            logger.info(`If everything seems good, see \`${apiRepoPath}/README.md\` and \`${appRepoPath}/README.md\` to get started.`)
            logger.info(`If not, please contact developer-support@molecule.dev so we can fix this.`)
          } else {
            logger.info(`Your Molecule was successfully cloned!`)
            logger.info(`See \`${apiRepoPath}/README.md\` and \`${appRepoPath}/README.md\` to get started.`)
          }
        } else if (apiSelectionHash) {
          if (apiError) {
            logger.info(`There may have been an error cloning your Molecule API.`)
            logger.info(`If everything seems good, see \`${apiRepoPath}/README.md\` to get started.`)
            logger.info(`If not, please contact developer-support@molecule.dev so we can fix this.`)
          } else {
            logger.info(`Your Molecule API was successfully cloned!`)
            logger.info(`See \`${apiRepoPath}/README.md\` to get started.`)
          }
        } else if (appSelectionHash) {
          if (appError) {
            logger.info(`There may have been an error cloning your Molecule app.`)
            logger.info(`If everything seems good, see \`${appRepoPath}/README.md\` to get started.`)
            logger.info(`If not, please contact developer-support@molecule.dev so we can fix this.`)
          } else {
            logger.info(`Your Molecule app was successfully cloned!`)
            logger.info(`See \`${appRepoPath}/README.md\` to get started.`)
          }
        }
      } catch (error) {
        logger.warn(`Error cloning Molecule: ${getErrorMessage(error) || `Unknown error`}`)
        logger.warn(`Please contact developer-support@molecule.dev so we can fix this.`)
      }
    })
}
