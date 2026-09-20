import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { getPricingTiers, type ShiftSchedulingLimits, shiftSchedulingPlanKeys } from '../tiers.js'

export default createBillingRouter<ShiftSchedulingLimits>({
  getPricingTiers,
  planKeys: shiftSchedulingPlanKeys,
})
