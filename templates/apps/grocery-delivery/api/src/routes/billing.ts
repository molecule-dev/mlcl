import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { getPricingTiers, type GroceryDeliveryLimits, groceryDeliveryPlanKeys } from '../tiers.js'

export default createBillingRouter<GroceryDeliveryLimits>({
  getPricingTiers,
  planKeys: groceryDeliveryPlanKeys,
})
