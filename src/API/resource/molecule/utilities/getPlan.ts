import * as types from '../types.js'
import { plans } from '../../payment/plans.js'

/**
 * Gets a molecule's current `plan`.
 */
export const getPlan = (molecule: types.Props) => {
  let plan = plans['']

  const planExpiresTime = (molecule.planExpiresAt && new Date(String(molecule.planExpiresAt)).getTime()) || 0

  if (molecule.planKey && plans[molecule.planKey] && (!planExpiresTime || (Date.now() < planExpiresTime))) {
    plan = plans[molecule.planKey]
  }

  plan = {
    ...plan,
  }

  return plan
}
