import { read as readUser } from '../API/resource/user/index.js'
import { userConfig } from '../userConfig.js'
import { writeUserConfig } from '../utilities/writeUserConfig.js'
import { logger } from '../logger.js'
import { getErrorMessage } from '../utilities/getErrorMessage.js'

export const synchronizeUserConfig = async () => {
  if (userConfig.user) {
    try {
      const { props: user } = (await readUser(userConfig.user.id)).data

      if (!user) {
        throw new Error(`No user was returned by the Molecule.dev API.`)
      }

      if (userConfig.user?.id === user.id) {
        userConfig.user = user
        writeUserConfig()
      } else {
        logger.warn(`The Molecule.dev API returned an unexpected response when synchronizing the user.`)
      }
    } catch (error) {
      logger.warn(`Error fetching user: ${getErrorMessage(error) || `Unknown error`}`)
    }
  }
}
