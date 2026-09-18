import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { type FoodDeliveryLimits, foodDeliveryPlanKeys, getPricingTiers } from '../tiers.js'

export default createBillingRouter<FoodDeliveryLimits>({
  getPricingTiers,
  planKeys: foodDeliveryPlanKeys,
})
