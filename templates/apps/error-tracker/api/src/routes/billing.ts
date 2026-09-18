import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { type ErrorTrackerLimits, errorTrackerPlanKeys, getPricingTiers } from '../tiers.js'

export default createBillingRouter<ErrorTrackerLimits>({
  getPricingTiers,
  planKeys: errorTrackerPlanKeys,
})
