import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { type AiTravelAgentLimits, aiTravelAgentPlanKeys, getPricingTiers } from '../tiers.js'

export default createBillingRouter<AiTravelAgentLimits>({
  getPricingTiers,
  planKeys: aiTravelAgentPlanKeys,
})
