import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { getPricingTiers, type PropertyListingLimits, propertyListingPlanKeys } from '../tiers.js'

export default createBillingRouter<PropertyListingLimits>({
  getPricingTiers,
  planKeys: propertyListingPlanKeys,
})
