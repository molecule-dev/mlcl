import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { type ExpenseReportLimits, expenseReportPlanKeys, getPricingTiers } from '../tiers.js'

export default createBillingRouter<ExpenseReportLimits>({
  getPricingTiers,
  planKeys: expenseReportPlanKeys,
})
