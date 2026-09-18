import { createBillingRouter } from '@molecule/api-bonds-default-express'

import {
  getPricingTiers,
  type RestaurantOrderingLimits,
  restaurantOrderingPlanKeys,
} from '../tiers.js'

export default createBillingRouter<RestaurantOrderingLimits>({
  getPricingTiers,
  planKeys: restaurantOrderingPlanKeys,
})
