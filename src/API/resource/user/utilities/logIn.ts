import os from 'os'
import open from 'open'
import { logInCLI } from '../index.js'
import { getUserIdsToDeviceIds } from '../../../authorization.js'
import { logger } from '../../../../logger.js'
import { getErrorMessage } from '../../../../utilities/getErrorMessage.js'
import { userConfig } from '../../../../userConfig.js'
import { writeUserConfig } from '../../../../utilities/writeUserConfig.js'

const CHECK_AFTER = 3000 // 3 seconds
const MAX_TRIES = 20

export const logIn = async () => {
  const deviceIds = Object.values(getUserIdsToDeviceIds())
  const deviceName = `CLI (${os.platform()})`
  let token = ``

  try {
    token = (await logInCLI({ deviceIds, deviceName })).data.token || ``

    if (!token) {
      logger.warn(`No token was returned by the API.`)
      return
    }
  } catch (error) {
    logger.warn(`Error fetching token: ${getErrorMessage(error)}`)
    return
  }

  logger.info(`Opening your browser and waiting for your allowance...`)

  const url = `${process.env.WEB_ORIGIN}/#/allow-auth-token?token=${encodeURIComponent(token)}`

  const childProcess = await open(url)

  childProcess.on(`error`, error => {
    logger.warn(`Error opening the auth URL: ${getErrorMessage(error)}`)
    logger.warn(`If your browser didn't open on its own, visit the following URL to continue logging in: ${url}`)
  })

  childProcess.on(`close`, code => {
    if (code !== 0) {
      logger.warn(`If your browser didn't open on its own, visit the following URL to continue logging in: ${url}`)
    }
  })

  const check = async (tryCount = 0) => {
    if (tryCount >= MAX_TRIES) {
      logger.info(`Reached maximum number of tries.`)
      return
    }

    try {
      await new Promise(resolve => setTimeout(resolve, CHECK_AFTER))

      const user = (await logInCLI({ token, deviceIds, deviceName })).data.props

      if (user) {
        logger.info(`Hello, ${user.name || user.username}!`)
        userConfig.user = user
        writeUserConfig()
      } else {
        await check(tryCount + 1)
      }
    } catch (error) {
      await check(tryCount + 1)
    }
  }

  await check()
}
