import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { type CalorieCounterLimits, calorieCounterPlanKeys, getPricingTiers } from '../tiers.js'

export default createBillingRouter<CalorieCounterLimits>({
  getPricingTiers,
  planKeys: calorieCounterPlanKeys,
})
