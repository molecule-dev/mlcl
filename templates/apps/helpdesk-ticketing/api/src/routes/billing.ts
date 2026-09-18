import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { getPricingTiers, type HelpdeskLimits, helpdeskPlanKeys } from '../tiers.js'

export default createBillingRouter<HelpdeskLimits>({
  getPricingTiers,
  planKeys: helpdeskPlanKeys,
})
