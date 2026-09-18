import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { getPricingTiers, type OkrGoalTrackingLimits, okrGoalTrackingPlanKeys } from '../tiers.js'

export default createBillingRouter<OkrGoalTrackingLimits>({
  getPricingTiers,
  planKeys: okrGoalTrackingPlanKeys,
})
