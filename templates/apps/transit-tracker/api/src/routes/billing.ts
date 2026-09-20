import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { getPricingTiers, type TransitTrackerLimits, transitTrackerPlanKeys } from '../tiers.js'

export default createBillingRouter<TransitTrackerLimits>({
  getPricingTiers,
  planKeys: transitTrackerPlanKeys,
})
