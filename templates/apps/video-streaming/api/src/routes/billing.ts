import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { getPricingTiers, type VideoStreamingLimits, videoStreamingPlanKeys } from '../tiers.js'

export default createBillingRouter<VideoStreamingLimits>({
  getPricingTiers,
  planKeys: videoStreamingPlanKeys,
})
