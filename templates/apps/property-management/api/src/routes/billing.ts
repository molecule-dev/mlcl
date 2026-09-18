import { createBillingRouter } from '@molecule/api-bonds-default-express'

import {
  getPricingTiers,
  type PropertyManagementLimits,
  propertyManagementPlanKeys,
} from '../tiers.js'

export default createBillingRouter<PropertyManagementLimits>({
  getPricingTiers,
  planKeys: propertyManagementPlanKeys,
})
