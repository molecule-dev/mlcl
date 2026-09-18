import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { getPricingTiers, type PayrollManagerLimits, payrollManagerPlanKeys } from '../tiers.js'

export default createBillingRouter<PayrollManagerLimits>({
  getPricingTiers,
  planKeys: payrollManagerPlanKeys,
})
