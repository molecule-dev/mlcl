import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { getPricingTiers, type WeddingPlannerLimits, weddingPlannerPlanKeys } from '../tiers.js'

export default createBillingRouter<WeddingPlannerLimits>({
  getPricingTiers,
  planKeys: weddingPlannerPlanKeys,
})
