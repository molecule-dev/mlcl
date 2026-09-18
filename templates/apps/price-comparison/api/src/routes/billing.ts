import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { getPricingTiers, type PriceComparisonLimits, priceComparisonPlanKeys } from '../tiers.js'

export default createBillingRouter<PriceComparisonLimits>({
  getPricingTiers,
  planKeys: priceComparisonPlanKeys,
})
