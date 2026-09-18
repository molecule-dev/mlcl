import { createBillingRouter } from '@molecule/api-bonds-default-express'

import {
  type FeatureFlagManagerLimits,
  featureFlagManagerPlanKeys,
  getPricingTiers,
} from '../tiers.js'

export default createBillingRouter<FeatureFlagManagerLimits>({
  getPricingTiers,
  planKeys: featureFlagManagerPlanKeys,
})
