import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { getPricingTiers, type StudentPortalLimits, studentPortalPlanKeys } from '../tiers.js'

export default createBillingRouter<StudentPortalLimits>({
  getPricingTiers,
  planKeys: studentPortalPlanKeys,
})
