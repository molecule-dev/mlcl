import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { getPricingTiers, type StatusPageLimits, statusPagePlanKeys } from '../tiers.js'

export default createBillingRouter<StatusPageLimits>({
  getPricingTiers,
  planKeys: statusPagePlanKeys,
})
