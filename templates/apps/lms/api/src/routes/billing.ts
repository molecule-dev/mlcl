import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { getPricingTiers, type LmsLimits, lmsPlanKeys } from '../tiers.js'

export default createBillingRouter<LmsLimits>({
  getPricingTiers,
  planKeys: lmsPlanKeys,
})
