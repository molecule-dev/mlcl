import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { type ForumLimits, forumPlanKeys, getPricingTiers } from '../tiers.js'

export default createBillingRouter<ForumLimits>({
  getPricingTiers,
  planKeys: forumPlanKeys,
})
