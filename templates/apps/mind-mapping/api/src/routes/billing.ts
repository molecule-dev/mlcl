import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { getPricingTiers, type MindMappingLimits, mindMappingPlanKeys } from '../tiers.js'

export default createBillingRouter<MindMappingLimits>({
  getPricingTiers,
  planKeys: mindMappingPlanKeys,
})
