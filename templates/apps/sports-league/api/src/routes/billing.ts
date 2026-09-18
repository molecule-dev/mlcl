import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { getPricingTiers, type SportsLeagueLimits, sportsLeaguePlanKeys } from '../tiers.js'

export default createBillingRouter<SportsLeagueLimits>({
  getPricingTiers,
  planKeys: sportsLeaguePlanKeys,
})
