/**
 * The user API resource.
 * 
 * @module
 */

import { client } from '../../client.js'
import * as authorization from '../../authorization.js'
import * as types from './types.js'

export * as utilities from './utilities/index.js'
export * as types from './types.js'

export const logInCLI = ({
  token,
  deviceIds,
  deviceName
}: types.LogInCLIProps): Promise<types.LogInCLIResponse> => (
  client.post(`users/log-in/cli`, { token, deviceIds, deviceName })
)

export const logOut = async (): Promise<null> => {
  authorization.removeHeader()
  return null
}

export const read = (id: string): Promise<types.SuccessResponse> => (
  client.get(`users/${id}`)
)
