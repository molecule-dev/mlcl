import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { getPricingTiers, type JobBoardLimits, jobBoardPlanKeys } from '../tiers.js'

export default createBillingRouter<JobBoardLimits>({
  getPricingTiers,
  planKeys: jobBoardPlanKeys,
})
