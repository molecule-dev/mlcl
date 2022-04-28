import open from 'open'
import { Command } from 'commander'
import { userLoggedIn } from '../utilities/userLoggedIn.js'
import { repoConfig } from '../repoConfig.js'
import { logger } from '../logger.js'
import { getErrorMessage } from '../utilities/getErrorMessage.js'

/**
 * Adds the `info` command to the program.
 */
export const info = (program: Command) => {
  program.command(`info`)
    .description(`opens your Molecule's information on Molecule.dev`)
    .action(async () => {
      const user = await userLoggedIn()

      if (!user) {
        return
      }

      if (!repoConfig?.id) {
        logger.warn(`Not within a Molecule repository or \`.mlclrc.json\` not found.`)
        return
      }

      const url = `${process.env.WEB_ORIGIN}/#/${encodeURIComponent(repoConfig.id)}`
      const childProcess = await open(url)

      childProcess.on(`error`, error => {
        logger.warn(`Error opening the URL: ${getErrorMessage(error)}`)
        logger.warn(`If your browser didn't open on its own, visit the following URL: ${url}`)
      })

      childProcess.on(`close`, code => {
        if (code !== 0) {
          logger.warn(`If your browser didn't open on its own, visit the following URL: ${url}`)
        }
      })
    })
}
