import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { getPricingTiers, type MealPlannerLimits, mealPlannerPlanKeys } from '../tiers.js'

export default createBillingRouter<MealPlannerLimits>({
  getPricingTiers,
  planKeys: mealPlannerPlanKeys,
})
