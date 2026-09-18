import { createBillingRouter } from '@molecule/api-bonds-default-express'

import {
  type AiAgentPlaygroundLimits,
  aiAgentPlaygroundPlanKeys,
  getPricingTiers,
} from '../tiers.js'

export default createBillingRouter<AiAgentPlaygroundLimits>({
  getPricingTiers,
  planKeys: aiAgentPlaygroundPlanKeys,
})
