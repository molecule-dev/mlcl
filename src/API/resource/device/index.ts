/**
 * The device API resource.
 * 
 * @module
 */

import { client } from '../../client.js'
import * as types from './types.js'

export * as utilities from './utilities/index.js'
export * as types from './types.js'

export const query = (): Promise<types.QueryResponse> => (
  client.get(`devices`)
)

export const read = (id: string): Promise<types.SuccessResponse> => (
  client.get(`devices/${id}`)
)

export const update = (id: string, props: types.UpdateProps): Promise<types.SuccessPartialResponse> => (
  client.patch(`devices/${id}`, props)
)

export const del = (id: string): Promise<types.SuccessPartialResponse> => (
  client.delete(`devices/${id}`)
)
