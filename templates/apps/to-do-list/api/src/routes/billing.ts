import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { getPricingTiers, type ToDoListLimits, toDoListPlanKeys } from '../tiers.js'

export default createBillingRouter<ToDoListLimits>({
  getPricingTiers,
  planKeys: toDoListPlanKeys,
})
