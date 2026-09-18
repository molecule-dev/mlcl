import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { getPricingTiers, type TeamChatLimits, teamChatPlanKeys } from '../tiers.js'

export default createBillingRouter<TeamChatLimits>({
  getPricingTiers,
  planKeys: teamChatPlanKeys,
})
