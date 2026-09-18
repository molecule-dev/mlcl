import { createBillingRouter } from '@molecule/api-bonds-default-express'

import {
  getPricingTiers,
  type ProjectManagementLimits,
  projectManagementPlanKeys,
} from '../tiers.js'

export default createBillingRouter<ProjectManagementLimits>({
  getPricingTiers,
  planKeys: projectManagementPlanKeys,
})
