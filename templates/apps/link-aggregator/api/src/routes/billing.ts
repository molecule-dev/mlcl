import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { getPricingTiers, type LinkAggregatorLimits, linkAggregatorPlanKeys } from '../tiers.js'

export default createBillingRouter<LinkAggregatorLimits>({
  getPricingTiers,
  planKeys: linkAggregatorPlanKeys,
})
