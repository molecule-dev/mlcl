import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { getPricingTiers, type TimeTrackingLimits, timeTrackingPlanKeys } from '../tiers.js'

export default createBillingRouter<TimeTrackingLimits>({
  getPricingTiers,
  planKeys: timeTrackingPlanKeys,
})
