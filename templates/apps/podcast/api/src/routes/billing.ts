import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { getPricingTiers, type PodcastLimits, podcastPlanKeys } from '../tiers.js'

export default createBillingRouter<PodcastLimits>({
  getPricingTiers,
  planKeys: podcastPlanKeys,
})
