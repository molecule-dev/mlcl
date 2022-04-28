/**
 * The `molecule` API resource.
 * 
 * @module
 */

import { client } from '../../client.js'
import * as types from './types.js'

export * as types from './types.js'

export const read = (id: string): Promise<types.SuccessResponse> => (
  client.get(`molecules/${id}`)
)

export const readClone = (id: string): Promise<types.CloneResponse> => (
  client.get(`molecules/${id}/clone`)
)

export const create = (props: types.CreateProps): Promise<types.SuccessResponse | types.MessageResponse> => (
  client.post(`molecules`, props)
)

export const update = (id: string, props: types.UpdateProps): Promise<types.SuccessPartialResponse> => (
  client.patch(`molecules/${id}`, props)
)

export const updatePlan = (id: string, { planKey, receipt, quantity }: types.UpdatePlanProps): Promise<types.UpdatePlanResponse> => (
  client.patch(`molecules/${id}/plan`, { planKey, receipt, quantity })
)
