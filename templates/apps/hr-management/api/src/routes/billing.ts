import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { getPricingTiers, type HrManagementLimits, hrManagementPlanKeys } from '../tiers.js'

export default createBillingRouter<HrManagementLimits>({
  getPricingTiers,
  planKeys: hrManagementPlanKeys,
})
