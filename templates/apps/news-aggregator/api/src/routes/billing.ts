import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { getPricingTiers, type NewsAggregatorLimits, newsAggregatorPlanKeys } from '../tiers.js'

export default createBillingRouter<NewsAggregatorLimits>({
  getPricingTiers,
  planKeys: newsAggregatorPlanKeys,
})
