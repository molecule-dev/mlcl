import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { type BookTrackerLimits, bookTrackerPlanKeys, getPricingTiers } from '../tiers.js'

export default createBillingRouter<BookTrackerLimits>({
  getPricingTiers,
  planKeys: bookTrackerPlanKeys,
})
