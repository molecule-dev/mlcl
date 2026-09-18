import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { getPricingTiers, type WorkoutTrackerLimits, workoutTrackerPlanKeys } from '../tiers.js'

export default createBillingRouter<WorkoutTrackerLimits>({
  getPricingTiers,
  planKeys: workoutTrackerPlanKeys,
})
