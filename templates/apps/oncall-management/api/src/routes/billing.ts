import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { getPricingTiers, type OncallLimits, oncallPlanKeys } from '../tiers.js'

export default createBillingRouter<OncallLimits>({
  getPricingTiers,
  planKeys: oncallPlanKeys,
})
