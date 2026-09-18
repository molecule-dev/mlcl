import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { getPricingTiers, type WikiLimits, wikiPlanKeys } from '../tiers.js'

export default createBillingRouter<WikiLimits>({
  getPricingTiers,
  planKeys: wikiPlanKeys,
})
