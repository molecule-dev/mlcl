import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { type BlogLimits, blogPlanKeys, getPricingTiers } from '../tiers.js'

export default createBillingRouter<BlogLimits>({
  getPricingTiers,
  planKeys: blogPlanKeys,
})
