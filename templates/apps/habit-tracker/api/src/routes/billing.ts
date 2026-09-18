import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { getPricingTiers, type HabitTrackerLimits, habitTrackerPlanKeys } from '../tiers.js'

export default createBillingRouter<HabitTrackerLimits>({
  getPricingTiers,
  planKeys: habitTrackerPlanKeys,
})
