import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { type BudgetPlannerLimits, budgetPlannerPlanKeys, getPricingTiers } from '../tiers.js'

export default createBillingRouter<BudgetPlannerLimits>({
  getPricingTiers,
  planKeys: budgetPlannerPlanKeys,
})
