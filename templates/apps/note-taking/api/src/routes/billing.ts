import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { getPricingTiers, type NoteTakingLimits, noteTakingPlanKeys } from '../tiers.js'

export default createBillingRouter<NoteTakingLimits>({
  getPricingTiers,
  planKeys: noteTakingPlanKeys,
})
