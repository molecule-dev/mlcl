import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { getPricingTiers, type SleepTrackerLimits, sleepTrackerPlanKeys } from '../tiers.js'

export default createBillingRouter<SleepTrackerLimits>({
  getPricingTiers,
  planKeys: sleepTrackerPlanKeys,
})
