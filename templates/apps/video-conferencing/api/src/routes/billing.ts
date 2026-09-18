import { createBillingRouter } from '@molecule/api-bonds-default-express'

import {
  getPricingTiers,
  type VideoConferencingLimits,
  videoConferencingPlanKeys,
} from '../tiers.js'

export default createBillingRouter<VideoConferencingLimits>({
  getPricingTiers,
  planKeys: videoConferencingPlanKeys,
})
