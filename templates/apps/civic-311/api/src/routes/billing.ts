import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { type CivicLimits, civicPlanKeys, getPricingTiers } from '../tiers.js'

export default createBillingRouter<CivicLimits>({
  getPricingTiers,
  planKeys: civicPlanKeys,
})
