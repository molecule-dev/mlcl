import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { type AiStudyBuddyLimits, aiStudyBuddyPlanKeys, getPricingTiers } from '../tiers.js'

export default createBillingRouter<AiStudyBuddyLimits>({
  getPricingTiers,
  planKeys: aiStudyBuddyPlanKeys,
})
