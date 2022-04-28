/**
 * Methods for API authorization management.
 * 
 * @module
 */

import { AxiosError, AxiosResponse } from 'axios'
import jwtDecode, { JwtPayload } from 'jwt-decode'
import { client } from './client.js'
import { userConfig } from '../userConfig.js'
import { writeUserConfig } from '../utilities/writeUserConfig.js'
import { logger } from '../logger.js'

/**
 * Sets the `Authorization` header on the API client (`axios` instance)
 * and saves it within the user config.
 */
export const setHeader = (authorizationHeader = userConfig.authorizationHeader || ``) => {
  if (authorizationHeader) {
    client.defaults.headers.common.Authorization = authorizationHeader
    userConfig.authorizationHeader = authorizationHeader
    writeUserConfig()
  }
}

/**
 * Removes the `Authorization` header from the API client (`axios` instance)
 * and removes it from the user config.
 */
export const removeHeader = () => {
  if (client.defaults.headers) {
    delete client.defaults.headers.common.Authorization
  }

  delete userConfig.authorizationHeader
  writeUserConfig()
}

/**
 * If multiple users log into the same device, we use this map of user IDs to device IDs
 * to allow users to properly reidentify the device when switching between users.
 */
export const getUserIdsToDeviceIds = (): { [userId: string]: string } => {
  if (!userConfig.userIdsToDeviceIds) {
    userConfig.userIdsToDeviceIds = {}
  }

  return userConfig.userIdsToDeviceIds
}

/**
 * Gets the `userId` and `deviceId` from the decoded `Authorization` header
 * and saves it within the config as a map of user IDs to device IDs.
 */
export const setUserIdToDeviceId = (authorizationHeader: string) => {
  try {
    const [ bearer = ``, authorizationToken = `` ] = authorizationHeader.split(` `)
    const { session } = jwtDecode<JwtPayload & { session: { userId: string; deviceId: string } }>(authorizationToken)
    const { userId, deviceId } = session
    const userIdsToDeviceIds = getUserIdsToDeviceIds()

    if (bearer && userId && deviceId) {
      userIdsToDeviceIds[userId] = deviceId
      writeUserConfig()
    }
  } catch (error) {
    logger.error(error)
  }
}

export type interceptResponseProps = {
  /**
   * Called when the `Authorization` header is set.
   */
  onSet?: () => void
}

/**
 * If the `Set-Authorization` header is included in the response,
 * sets the header and user ID to device ID.
 */
export const interceptResponse = ({ onSet }: interceptResponseProps = {}) => (response: AxiosResponse): AxiosResponse => {
  if (response.headers[`set-authorization`]) {
    setHeader(response.headers[`set-authorization`])
    setUserIdToDeviceId(response.headers[`set-authorization`])

    if (onSet) {
      onSet()
    }
  }

  return response
}

export type interceptErrorProps = {
  /**
   * Called when the `Authorization` header is set.
   */
  onSet?: () => void
  /**
   * Called when the `Authorization` header is removed.
   */
  onRemove?: () => void
}

/**
 * Removes the `Authorization` header if the response status code is `401`,
 * or if the `Set-Authorization` header is included in the error response,
 * sets the header and user ID to device ID.
 */
export const interceptError = ({ onSet, onRemove }: interceptErrorProps = {}) => (error: AxiosError): Promise<AxiosError> => {
  if (error?.response?.status === 401) {
    removeHeader()

    if (onRemove) {
      onRemove()
    }
  } else if (error?.response?.headers[`set-authorization`]) {
    setHeader(error.response.headers[`set-authorization`])
    setUserIdToDeviceId(error.response.headers[`set-authorization`])

    if (onSet) {
      onSet()
    }
  }

  return Promise.reject(error)
}

// Set the locally stored authorization header, if it exists.
setHeader()

// Intercept all requests to set and/or remove the authorization header.
client.interceptors.response.use(
  interceptResponse(), // Locally store authorization headers when provided.
  interceptError({
    onRemove: () => {
      // Log out when authorization removed.
      delete userConfig.user
      writeUserConfig()
    }
  })
)
