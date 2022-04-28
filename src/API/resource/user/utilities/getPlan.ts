import * as types from '../types.js'
import { plans } from '../../payment/plans.js'

/**
 * Gets a user's current `plan`.
 */
export const getPlan = (user: types.Props) => {
  const planKey = user.planKey || ``
  const planExpiresTime = (user.planExpiresAt && new Date(String(user.planExpiresAt)).getTime()) || 0

  if (plans[planKey] && Date.now() < planExpiresTime) {
    return plans[planKey]
  }

  return plans['']
}
