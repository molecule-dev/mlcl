import { createBillingRouter } from '@molecule/api-bonds-default-express'

import {
  type ConstructionManagementLimits,
  constructionManagementPlanKeys,
  getPricingTiers,
} from '../tiers.js'

export default createBillingRouter<ConstructionManagementLimits>({
  getPricingTiers,
  planKeys: constructionManagementPlanKeys,
})
