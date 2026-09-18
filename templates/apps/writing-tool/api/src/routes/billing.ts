import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { getPricingTiers, type WritingToolLimits, writingToolPlanKeys } from '../tiers.js'

export default createBillingRouter<WritingToolLimits>({
  getPricingTiers,
  planKeys: writingToolPlanKeys,
})
