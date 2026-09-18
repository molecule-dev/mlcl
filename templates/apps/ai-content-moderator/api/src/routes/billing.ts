import { createBillingRouter } from '@molecule/api-bonds-default-express'

import {
  type AiContentModeratorLimits,
  aiContentModeratorPlanKeys,
  getPricingTiers,
} from '../tiers.js'

export default createBillingRouter<AiContentModeratorLimits>({
  getPricingTiers,
  planKeys: aiContentModeratorPlanKeys,
})
