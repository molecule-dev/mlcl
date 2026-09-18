import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { type CrowdfundingLimits, crowdfundingPlanKeys, getPricingTiers } from '../tiers.js'

export default createBillingRouter<CrowdfundingLimits>({
  getPricingTiers,
  planKeys: crowdfundingPlanKeys,
})
